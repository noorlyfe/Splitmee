import { useCallback, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

/** Free tier: splits (receipts saved / shared) per calendar day. */
export const FREE_SPLITS_PER_DAY = 5;

const STORAGE_KEY = "@nudgrr/split_quota_v1";

type Payload = { day: string; count: number };

const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) {
    l();
  }
}

function dayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function read(): Promise<Payload> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { day: dayKey(), count: 0 };
    }
    const p = JSON.parse(raw) as Payload;
    if (typeof p?.day !== "string" || typeof p?.count !== "number") {
      return { day: dayKey(), count: 0 };
    }
    return p;
  } catch {
    return { day: dayKey(), count: 0 };
  }
}

export function useSplitQuota(isPro: boolean) {
  const [usedToday, setUsedToday] = useState(0);
  const [loading, setLoading] = useState(true);

  const sync = useCallback(async () => {
    let p = await read();
    const day = dayKey();
    if (p.day !== day) {
      p = { day, count: 0 };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(p));
    }
    setUsedToday(p.count);
  }, []);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        await sync();
      } finally {
        setLoading(false);
      }
    })();
  }, [sync]);

  useEffect(() => {
    const onChange = () => {
      void sync();
    };
    listeners.add(onChange);
    return () => {
      listeners.delete(onChange);
    };
  }, [sync]);

  const remainingFree = Math.max(0, FREE_SPLITS_PER_DAY - usedToday);
  const canSaveFree = isPro || usedToday < FREE_SPLITS_PER_DAY;

  const recordSplit = useCallback(async () => {
    if (isPro) {
      return;
    }
    const day = dayKey();
    let p = await read();
    if (p.day !== day) {
      p = { day, count: 0 };
    }
    p.count += 1;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(p));
    emit();
  }, [isPro]);

  return {
    usedToday,
    remainingFree,
    canSaveFree,
    loading,
    recordSplit,
    reload: sync,
  };
}
