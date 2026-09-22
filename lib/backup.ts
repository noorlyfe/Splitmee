import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

const KNOWN_KEYS = [
  "@nudgrr/split_history_v1",
  "@nudgrr/people_v1",
  "nudgrr_projects",
  "@nudgrr/app_preferences_v2",
  "@nudgrr/app_preferences_v1",
  "@nudgrr/receipt_footer_v1",
  "@nudgrr/locale_override",
  "@nudgrr/theme_preference",
  "@nudgrr/nudge_quota_v2",
  "@nudgrr/split_quota_v1",
  "@nudgrr/escalation_alerts_v1",
  "@nudgrr/analytics_counters_v1",
  "@nudgrr/activity_feed_v1",
  "@nudgrr/fx_rates_v1",
  "@nudgrr/payment_profile_v1",
] as const;

export type NudgrrBackupPayload = {
  version: 1;
  exportedAt: string;
  data: Record<string, string | null>;
};

export async function buildBackupPayload(): Promise<NudgrrBackupPayload> {
  const data: Record<string, string | null> = {};
  for (const key of KNOWN_KEYS) {
    data[key] = await AsyncStorage.getItem(key);
  }
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    data,
  };
}

export async function restoreBackupPayload(payload: NudgrrBackupPayload): Promise<void> {
  if (!payload || payload.version !== 1 || !payload.data) {
    throw new Error("invalid_backup");
  }
  const entries = Object.entries(payload.data);
  for (const [key, value] of entries) {
    if (typeof key !== "string" || (!key.startsWith("@nudgrr/") && key !== "nudgrr_projects")) {
      continue;
    }
    if (value == null) {
      await AsyncStorage.removeItem(key);
    } else if (typeof value === "string") {
      await AsyncStorage.setItem(key, value);
    }
  }
}

export async function shareBackupJson(): Promise<void> {
  const payload = await buildBackupPayload();
  const json = JSON.stringify(payload, null, 2);
  const dir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!dir) {
    throw new Error("no_fs");
  }
  const path = `${dir}nudgrr-backup-${Date.now()}.json`;
  await FileSystem.writeAsStringAsync(path, json, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  const can = await Sharing.isAvailableAsync();
  if (!can) {
    throw new Error("sharing_unavailable");
  }
  await Sharing.shareAsync(path, {
    mimeType: "application/json",
    dialogTitle: "Splitmee backup",
    UTI: "public.json",
  });
}

export function splitsToCsv(
  rows: Array<Record<string, string | number | undefined | null>>
): string {
  if (rows.length === 0) {
    return "id,createdAt,restaurant,totalAmount,currency,paidAt\n";
  }
  const headers = Object.keys(rows[0]!);
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    if (/[",\n]/.test(s)) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => escape(row[h])).join(","));
  }
  return lines.join("\n");
}

export async function shareTextFile(filename: string, contents: string, mimeType: string): Promise<void> {
  const dir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!dir) {
    throw new Error("no_fs");
  }
  const path = `${dir}${filename}`;
  await FileSystem.writeAsStringAsync(path, contents, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  const can = await Sharing.isAvailableAsync();
  if (!can) {
    throw new Error("sharing_unavailable");
  }
  await Sharing.shareAsync(path, { mimeType, dialogTitle: filename });
}
