import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "@nudgrr/activity_feed_v1";
const MAX = 200;

export type ActivityKind =
  | "split_saved"
  | "nudge_sent"
  | "marked_paid"
  | "project_closed"
  | "escalation"
  | "backup"
  | "payment_open";

export type ActivityEvent = {
  id: string;
  at: string;
  kind: ActivityKind;
  title: string;
  detail?: string;
};

async function readAll(): Promise<ActivityEvent[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(Boolean) as ActivityEvent[];
  } catch {
    return [];
  }
}

async function writeAll(items: ActivityEvent[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX)));
}

const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) {
    l();
  }
}

export async function logActivity(
  kind: ActivityKind,
  title: string,
  detail?: string
): Promise<void> {
  const all = await readAll();
  const next: ActivityEvent = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    at: new Date().toISOString(),
    kind,
    title,
    detail,
  };
  await writeAll([next, ...all]);
  emit();
}

export function useActivityFeed() {
  const [items, setItems] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await readAll());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
    const onChange = () => {
      void reload();
    };
    listeners.add(onChange);
    return () => {
      listeners.delete(onChange);
    };
  }, [reload]);

  const clear = useCallback(async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    emit();
  }, []);

  return { items, loading, reload, clear, log: logActivity };
}
