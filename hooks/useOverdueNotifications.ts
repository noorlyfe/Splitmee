import { useCallback, useEffect, useRef } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";

import type { SplitRecord } from "./useSplitHistory";
import type { Project } from "./useProjects";
import { getUnpaidProjectDebts } from "./useProjects";
import { getEscalationTier } from "../lib/escalation";

const MS_DAY = 86_400_000;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

function daysWaiting(iso: string): number {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) {
    return 0;
  }
  return Math.max(0, Math.floor((Date.now() - t) / MS_DAY));
}

function sentIso(record: SplitRecord): string {
  const n = typeof record.nudgeSentAt === "string" ? record.nudgeSentAt.trim() : "";
  return n || record.createdAt;
}

type Copy = {
  title: string;
  body: (name: string, days: number) => string;
};

/**
 * Schedules local overdue nags for unpaid debts. No backend.
 */
export function useOverdueNotifications(
  enabled: boolean,
  splits: SplitRecord[],
  projects: Project[],
  copy: Copy
) {
  const lastKey = useRef("");
  const copyRef = useRef(copy);
  copyRef.current = copy;

  const sync = useCallback(async () => {
    if (Platform.OS === "web" || !enabled) {
      return;
    }
    try {
      const existing = (await Notifications.getPermissionsAsync()) as {
        granted?: boolean;
        status?: string;
        ios?: { status?: number };
      };
      let granted =
        existing.granted === true ||
        existing.status === "granted" ||
        existing.ios?.status === 2 ||
        existing.ios?.status === 3;
      if (!granted) {
        const req = (await Notifications.requestPermissionsAsync()) as typeof existing;
        granted =
          req.granted === true ||
          req.status === "granted" ||
          req.ios?.status === 2 ||
          req.ios?.status === 3;
      }
      if (!granted) {
        return;
      }

      const unpaidSplits = splits.filter(
        (s) => !(typeof s.paidAt === "string" && s.paidAt.trim().length > 0)
      );
      const projectDebts = getUnpaidProjectDebts(projects);

      const candidates: Array<{ id: string; name: string; days: number }> = [];
      for (const s of unpaidSplits) {
        const days = daysWaiting(sentIso(s));
        const tier = getEscalationTier(days);
        if (tier === "fresh") {
          continue;
        }
        candidates.push({
          id: `split-${s.id}`,
          name: s.linkedPersonName?.trim() || s.restaurant || "Someone",
          days,
        });
      }
      for (const d of projectDebts) {
        const days = daysWaiting(d.closedAt);
        if (getEscalationTier(days) === "fresh") {
          continue;
        }
        candidates.push({
          id: `proj-${d.transferId}`,
          name: d.participantName,
          days,
        });
      }

      candidates.sort((a, b) => b.days - a.days);
      const top = candidates.slice(0, 6);
      const key = top.map((c) => `${c.id}:${c.days}`).join("|");
      if (key === lastKey.current) {
        return;
      }
      lastKey.current = key;

      const pending = await Notifications.getAllScheduledNotificationsAsync();
      for (const n of pending) {
        if (n.identifier.startsWith("nudgrr-overdue-")) {
          await Notifications.cancelScheduledNotificationAsync(n.identifier);
        }
      }

      let staggerSeconds = 60 * 60 * 3;
      for (const c of top) {
        await Notifications.scheduleNotificationAsync({
          identifier: `nudgrr-overdue-${c.id}`,
          content: {
            title: copyRef.current.title,
            body: copyRef.current.body(c.name, c.days),
            sound: true,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: staggerSeconds,
            repeats: false,
          },
        });
        staggerSeconds += 60 * 60 * 18;
      }
    } catch {
      // Best-effort local notifications only
    }
  }, [enabled, projects, splits]);

  useEffect(() => {
    void sync();
  }, [sync]);
}
