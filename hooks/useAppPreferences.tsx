import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

import type { NudgeTone } from "../constants/messages";
import {
  DEFAULT_RECEIPT_TEMPLATE,
  isReceiptTemplateId,
  type ReceiptTemplateId,
} from "../constants/receiptTemplates";
import { setHapticsEnabled } from "../lib/appHaptics";
import { isValidCurrencyCode } from "../lib/currency";
import { LOCALE_DEFAULT_CURRENCY } from "../lib/i18n";

const PREFERENCES_KEY_V2 = "@nudgrr/app_preferences_v2";
const PREFERENCES_KEY_V1 = "@nudgrr/app_preferences_v1";

const LOCALE_DEFAULT_CURRENCY_CODES = new Set(Object.values(LOCALE_DEFAULT_CURRENCY));

type Preferences = {
  defaultTone: NudgeTone;
  defaultTemplateId: ReceiptTemplateId;
  currency: string;
  hideReceiptBranding: boolean;
  paymentHint: string;
  overdueNotifications: boolean;
  hapticsEnabled: boolean;
};

const DEFAULT_PREFERENCES: Preferences = {
  defaultTone: "funny",
  defaultTemplateId: DEFAULT_RECEIPT_TEMPLATE,
  currency: "USD",
  hideReceiptBranding: false,
  paymentHint: "",
  overdueNotifications: true,
  hapticsEnabled: true,
};

function isTone(value: string): value is NudgeTone {
  return value === "funny" || value === "casual" || value === "passiveAggressive" || value === "serious";
}

function isAllowedCurrencyCode(code: string): boolean {
  return isValidCurrencyCode(code) || LOCALE_DEFAULT_CURRENCY_CODES.has(code);
}

type AppPreferencesContextValue = {
  loaded: boolean;
  defaultTone: NudgeTone;
  setDefaultTone: (tone: NudgeTone) => Promise<void>;
  defaultTemplateId: ReceiptTemplateId;
  setDefaultTemplateId: (id: ReceiptTemplateId) => Promise<void>;
  currency: string;
  setCurrency: (code: string) => Promise<void>;
  hideReceiptBranding: boolean;
  setHideReceiptBranding: (hide: boolean) => Promise<void>;
  paymentHint: string;
  setPaymentHint: (hint: string) => Promise<void>;
  overdueNotifications: boolean;
  setOverdueNotifications: (on: boolean) => Promise<void>;
  hapticsEnabled: boolean;
  setHapticsEnabledPref: (on: boolean) => Promise<void>;
  reload: () => Promise<void>;
};

const AppPreferencesContext = createContext<AppPreferencesContextValue | null>(null);

export function AppPreferencesProvider({ children }: { children: React.ReactNode }) {
  const [loaded, setLoaded] = useState(false);
  const [defaultTone, setDefaultToneState] = useState<NudgeTone>(DEFAULT_PREFERENCES.defaultTone);
  const [defaultTemplateId, setDefaultTemplateIdState] = useState<ReceiptTemplateId>(
    DEFAULT_PREFERENCES.defaultTemplateId
  );
  const [currency, setCurrencyState] = useState<string>(DEFAULT_PREFERENCES.currency);
  const [hideReceiptBranding, setHideReceiptBrandingState] = useState<boolean>(
    DEFAULT_PREFERENCES.hideReceiptBranding
  );
  const [paymentHint, setPaymentHintState] = useState<string>(DEFAULT_PREFERENCES.paymentHint);
  const [overdueNotifications, setOverdueNotificationsState] = useState<boolean>(
    DEFAULT_PREFERENCES.overdueNotifications
  );
  const [hapticsEnabled, setHapticsEnabledState] = useState<boolean>(
    DEFAULT_PREFERENCES.hapticsEnabled
  );

  const loadFromStorage = useCallback(async () => {
    try {
      const raw =
        (await AsyncStorage.getItem(PREFERENCES_KEY_V2)) ??
        (await AsyncStorage.getItem(PREFERENCES_KEY_V1));
      if (!raw) {
        return;
      }
      const parsed = JSON.parse(raw) as Partial<Preferences>;
      if (typeof parsed.defaultTone === "string" && isTone(parsed.defaultTone)) {
        setDefaultToneState(parsed.defaultTone);
      }
      if (typeof parsed.defaultTemplateId === "string" && isReceiptTemplateId(parsed.defaultTemplateId)) {
        setDefaultTemplateIdState(parsed.defaultTemplateId);
      }
      if (typeof parsed.currency === "string") {
        const upper = parsed.currency.toUpperCase();
        if (isAllowedCurrencyCode(upper)) {
          setCurrencyState(upper);
        }
      }
      if (typeof parsed.hideReceiptBranding === "boolean") {
        setHideReceiptBrandingState(parsed.hideReceiptBranding);
      }
      if (typeof parsed.paymentHint === "string") {
        setPaymentHintState(parsed.paymentHint.slice(0, 120));
      }
      if (typeof parsed.overdueNotifications === "boolean") {
        setOverdueNotificationsState(parsed.overdueNotifications);
      }
      if (typeof parsed.hapticsEnabled === "boolean") {
        setHapticsEnabledState(parsed.hapticsEnabled);
        setHapticsEnabled(parsed.hapticsEnabled);
      }
    } catch {
      // ignore invalid payloads
    }
  }, []);

  useEffect(() => {
    let alive = true;
    void (async () => {
      await loadFromStorage();
      if (alive) {
        setLoaded(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [loadFromStorage]);

  useEffect(() => {
    setHapticsEnabled(hapticsEnabled);
  }, [hapticsEnabled]);

  const reload = useCallback(async () => {
    await loadFromStorage();
  }, [loadFromStorage]);

  const persist = useCallback(async (next: Preferences) => {
    try {
      await AsyncStorage.setItem(PREFERENCES_KEY_V2, JSON.stringify(next));
    } catch {
      // best-effort persistence
    }
  }, []);

  const snapshot = useCallback(
    (patch: Partial<Preferences>): Preferences => ({
      defaultTone,
      defaultTemplateId,
      currency,
      hideReceiptBranding,
      paymentHint,
      overdueNotifications,
      hapticsEnabled,
      ...patch,
    }),
    [
      currency,
      defaultTemplateId,
      defaultTone,
      hideReceiptBranding,
      overdueNotifications,
      paymentHint,
      hapticsEnabled,
    ]
  );

  const setDefaultTone = useCallback(
    async (tone: NudgeTone) => {
      setDefaultToneState(tone);
      await persist(snapshot({ defaultTone: tone }));
    },
    [persist, snapshot]
  );

  const setDefaultTemplateId = useCallback(
    async (id: ReceiptTemplateId) => {
      setDefaultTemplateIdState(id);
      await persist(snapshot({ defaultTemplateId: id }));
    },
    [persist, snapshot]
  );

  const setCurrency = useCallback(
    async (code: string) => {
      const upper = code.toUpperCase();
      if (!isAllowedCurrencyCode(upper)) {
        return;
      }
      setCurrencyState(upper);
      await persist(snapshot({ currency: upper }));
    },
    [persist, snapshot]
  );

  const setHideReceiptBranding = useCallback(
    async (hide: boolean) => {
      setHideReceiptBrandingState(hide);
      await persist(snapshot({ hideReceiptBranding: hide }));
    },
    [persist, snapshot]
  );

  const setPaymentHint = useCallback(
    async (hint: string) => {
      const next = hint.slice(0, 120);
      setPaymentHintState(next);
      await persist(snapshot({ paymentHint: next }));
    },
    [persist, snapshot]
  );

  const setOverdueNotifications = useCallback(
    async (on: boolean) => {
      setOverdueNotificationsState(on);
      await persist(snapshot({ overdueNotifications: on }));
    },
    [persist, snapshot]
  );

  const setHapticsEnabledPref = useCallback(
    async (on: boolean) => {
      setHapticsEnabledState(on);
      setHapticsEnabled(on);
      await persist(snapshot({ hapticsEnabled: on }));
    },
    [persist, snapshot]
  );

  const value: AppPreferencesContextValue = {
    loaded,
    defaultTone,
    setDefaultTone,
    defaultTemplateId,
    setDefaultTemplateId,
    currency,
    setCurrency,
    hideReceiptBranding,
    setHideReceiptBranding,
    paymentHint,
    setPaymentHint,
    overdueNotifications,
    setOverdueNotifications,
    hapticsEnabled,
    setHapticsEnabledPref,
    reload,
  };

  return <AppPreferencesContext.Provider value={value}>{children}</AppPreferencesContext.Provider>;
}

export function useAppPreferences(): AppPreferencesContextValue {
  const ctx = useContext(AppPreferencesContext);
  if (!ctx) {
    throw new Error("useAppPreferences must be used within AppPreferencesProvider");
  }
  return ctx;
}
