import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";

import { DEFAULT_FX_RATES_USD, type FxRateTable } from "../lib/fx";

const STORAGE_KEY = "@nudgrr/fx_rates_v1";

async function read(): Promise<FxRateTable> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULT_FX_RATES_USD };
    }
    const parsed = JSON.parse(raw) as FxRateTable;
    return { ...DEFAULT_FX_RATES_USD, ...parsed };
  } catch {
    return { ...DEFAULT_FX_RATES_USD };
  }
}

export function useFxRates() {
  const [rates, setRates] = useState<FxRateTable>({ ...DEFAULT_FX_RATES_USD });
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    setRates(await read());
  }, []);

  useEffect(() => {
    void (async () => {
      await reload();
      setLoaded(true);
    })();
  }, [reload]);

  const setRate = useCallback(async (code: string, rateVsUsd: number) => {
    const upper = code.toUpperCase();
    if (!Number.isFinite(rateVsUsd) || rateVsUsd <= 0) {
      return;
    }
    const next = { ...(await read()), [upper]: rateVsUsd };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setRates(next);
  }, []);

  const resetDefaults = useCallback(async () => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_FX_RATES_USD));
    setRates({ ...DEFAULT_FX_RATES_USD });
  }, []);

  return { rates, loaded, setRate, resetDefaults, reload };
}
