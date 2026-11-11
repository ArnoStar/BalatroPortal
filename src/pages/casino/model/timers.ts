import { useEffect, useState } from 'react';

/** calls `reload` every `every` ms while the page is shown */
export function use_poll(reload: () => void, every: number) {
  useEffect(() => {
    const timer = setInterval(() => {
      if (!document.hidden) reload();
    }, every);
    return () => clearInterval(timer);
  }, [reload, every]);
}

/** the time, updated every `every` ms */
export function use_now(every: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), every);
    return () => clearInterval(timer);
  }, [every]);
  return now;
}

/** how long the result of a draw is kept back while its animation plays (none with reduced motion) */
export function reveal_delay(ms: number): number {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : ms;
}

/** true once `ms` have passed since `key` changed */
export function use_revealed(key: string, ms: number): boolean {
  const [shown, setShown] = useState<string | null>(null);
  useEffect(() => {
    const delay = reveal_delay(ms);
    if (!delay) {
      setShown(key);
      return;
    }
    const timer = setTimeout(() => setShown(key), delay);
    return () => clearTimeout(timer);
  }, [key, ms]);
  return shown === key;
}
