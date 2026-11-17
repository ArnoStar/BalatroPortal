// Numbers, times and dates the way the player's language writes them.
import { current_lang, tp } from './i18n';

/** 12,400 (12 400 in Russian) */
export const fmt_number = (x: number, digits = 0) =>
  new Intl.NumberFormat(current_lang(), { maximumFractionDigits: digits }).format(x);

/** 12.4K (12,4 тыс.) */
export const fmt_compact = (x: number) => new Intl.NumberFormat(current_lang(), { notation: 'compact', maximumFractionDigits: 1 }).format(x);

/** 17 Nov 2026 */
export const fmt_date = (iso: string | number | Date, style: 'medium' | 'long' = 'medium') =>
  new Date(iso).toLocaleDateString(current_lang(), { dateStyle: style });

/** 17 Nov 2026, 14:05 */
export const fmt_datetime = (iso: string | number | Date, time: 'short' | 'medium' = 'short') =>
  new Date(iso).toLocaleString(current_lang(), { dateStyle: 'medium', timeStyle: time });

/** how long ago (or how soon) `iso` is; past a month, the date */
export function fmt_ago(iso: string, now = Date.now()): string {
  const relative = new Intl.RelativeTimeFormat(current_lang(), { numeric: 'auto' });
  const s = (Date.parse(iso) - now) / 1000;
  const a = Math.abs(s);
  if (a < 45) return relative.format(0, 'second');
  if (a < 3600) return relative.format(Math.round(s / 60), 'minute');
  if (a < 86400) return relative.format(Math.round(s / 3600), 'hour');
  if (a < 86400 * 7) return relative.format(Math.round(s / 86400), 'day');
  if (a < 86400 * 31) return relative.format(Math.round(s / (86400 * 7)), 'week');
  return fmt_date(iso);
}

/** a duration, its two largest units: "2 d 22 h", "5 h 12 min", "42 s" */
export function fmt_left(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d) return `${tp(d, '# d', '# d')} ${tp(h, '# h', '# h')}`;
  if (h) return `${tp(h, '# h', '# h')} ${tp(m, '# min', '# min')}`;
  if (m) return tp(m, '# min', '# min');
  return tp(s, '# s', '# s');
}
