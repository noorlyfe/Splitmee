import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useRef, useState } from "react";

import { getEscalationTier, tierRank, type EscalationTier } from "../lib/escalation";

const STORAGE_KEY = "@nudgrr/escalation_alerts_v1";

export type EscalationAlertCandidate = {
  id: string;
  name: string;
  days: number;
  tier: EscalationTier;
};

type StoredMap = Record<string, EscalationTier>;

async function readMap(): Promise<StoredMap> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as StoredMap;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

async function writeMap(map: StoredMap): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // best-effort
  }
}

/**
 * Surfaces an in-app escalate prompt when any unpaid item crosses into a
 * higher escalation tier than last acknowledged.
 */
export function useEscalationAlerts(candidates: EscalationAlertCandidate[], enabled: boolean) {
  const [alert, setAlert] = useState<EscalationAlertCandidate | null>(null);
  const checking = useRef(false);

  const dismiss = useCallback(async (candidate: EscalationAlertCandidate | null) => {
    if (candidate) {
      const map = await readMap();
      map[candidate.id] = candidate.tier;
      await writeMap(map);
    }
    setAlert(null);
  }, []);

  const check = useCallback(async () => {
    if (!enabled || checking.current || candidates.length === 0) {
      return;
    }
    checking.current = true;
    try {
      const map = await readMap();
      let best: EscalationAlertCandidate | null = null;
      for (const c of candidates) {
        const tier = getEscalationTier(c.days);
        const prev = map[c.id];
        if (!prev) {
          map[c.id] = tier;
          continue;
        }
        if (tierRank(tier) > tierRank(prev)) {
          if (!best || tierRank(tier) > tierRank(best.tier) || c.days > best.days) {
            best = { ...c, tier };
          }
        }
      }
      await writeMap(map);
      if (best) {
        setAlert(best);
      }
    } finally {
      checking.current = false;
    }
  }, [candidates, enabled]);

  useEffect(() => {
    void check();
  }, [check]);

  return { alert, dismiss, recheck: check };
}
