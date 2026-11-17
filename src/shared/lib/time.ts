// Times as the player reads them, in their language: "5 min ago", "in 2 days", "2 d 22 h".
import { fmt_ago, fmt_left } from '@/shared/i18n';

/** how long ago (or how soon) `iso` is; past a month, the date */
export const time_ago = (iso: string, now = Date.now()): string => fmt_ago(iso, now);

/** a duration, its two largest units: "2 d 22 h", "5 h 12 min", "42 s" */
export const time_left = (ms: number): string => fmt_left(ms);
