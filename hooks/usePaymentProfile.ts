import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";

import {
  EMPTY_PAYMENT_PROFILE,
  type PaymentProfile,
} from "../lib/paymentLinks";

const STORAGE_KEY = "@nudgrr/payment_profile_v1";

async function read(): Promise<PaymentProfile> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { ...EMPTY_PAYMENT_PROFILE };
    }
    const parsed = JSON.parse(raw) as Partial<PaymentProfile>;
    return {
      venmoHandle: typeof parsed.venmoHandle === "string" ? parsed.venmoHandle.slice(0, 40) : "",
      cashAppHandle: typeof parsed.cashAppHandle === "string" ? parsed.cashAppHandle.slice(0, 40) : "",
      paypalMe: typeof parsed.paypalMe === "string" ? parsed.paypalMe.slice(0, 80) : "",
      revolutTag: typeof parsed.revolutTag === "string" ? parsed.revolutTag.slice(0, 40) : "",
      wiseTag: typeof parsed.wiseTag === "string" ? parsed.wiseTag.slice(0, 120) : "",
      bankNote: typeof parsed.bankNote === "string" ? parsed.bankNote.slice(0, 160) : "",
    };
  } catch {
    return { ...EMPTY_PAYMENT_PROFILE };
  }
}

export function usePaymentProfile() {
  const [profile, setProfile] = useState<PaymentProfile>({ ...EMPTY_PAYMENT_PROFILE });
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    setProfile(await read());
  }, []);

  useEffect(() => {
    void (async () => {
      await reload();
      setLoaded(true);
    })();
  }, [reload]);

  const save = useCallback(async (next: PaymentProfile) => {
    const cleaned: PaymentProfile = {
      venmoHandle: next.venmoHandle.trim().slice(0, 40),
      cashAppHandle: next.cashAppHandle.trim().slice(0, 40),
      paypalMe: next.paypalMe.trim().slice(0, 80),
      revolutTag: next.revolutTag.trim().slice(0, 40),
      wiseTag: next.wiseTag.trim().slice(0, 120),
      bankNote: next.bankNote.trim().slice(0, 160),
    };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
    setProfile(cleaned);
  }, []);

  const patch = useCallback(
    async (partial: Partial<PaymentProfile>) => {
      const next = { ...profile, ...partial };
      await save(next);
    },
    [profile, save]
  );

  return { profile, loaded, save, patch, reload };
}
