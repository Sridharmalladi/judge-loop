import { useCallback, useEffect, useState } from "react";

const PREFIX = "judge-loop:byok:";

// sessionStorage, not localStorage — survives reloads within the tab so you
// don't retype your key every run, but is gone the moment the tab closes.
// Never sent anywhere but this app's own backend, and only for the run
// that's actively starting (see ModelConfig.api_key server-side: it's
// excluded from persistence there too).
export function useByokKeys() {
  const [keys, setKeys] = useState<Record<string, string>>({});

  useEffect(() => {
    const loaded: Record<string, string> = {};
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k?.startsWith(PREFIX)) loaded[k.slice(PREFIX.length)] = sessionStorage.getItem(k) ?? "";
    }
    setKeys(loaded);
  }, []);

  const setKey = useCallback((provider: string, value: string) => {
    setKeys((prev) => ({ ...prev, [provider]: value }));
    if (value) sessionStorage.setItem(PREFIX + provider, value);
    else sessionStorage.removeItem(PREFIX + provider);
  }, []);

  return { keys, setKey };
}
