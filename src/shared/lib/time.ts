// Times as the player reads them: "5 min ago", "in 2 days", "2 d 22 h".
const relative = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

/** how long ago (or how soon) `iso` is; past a month, the date */
export function time_ago(iso: string, now = Date.now()): string {
  const s = (Date.parse(iso) - now) / 1000;
  const a = Math.abs(s);
  if (a < 45) return s <= 0 ? 'just now' : 'in a moment';
  if (a < 3600) return relative.format(Math.round(s / 60), 'minute');
  if (a < 86400) return relative.format(Math.round(s / 3600), 'hour');
  if (a < 86400 * 7) return relative.format(Math.round(s / 86400), 'day');
  if (a < 86400 * 31) return relative.format(Math.round(s / (86400 * 7)), 'week');
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' });
}

/** a duration, its two largest units: "2 d 22 h", "5 h 12 min", "42 s" */
export function time_left(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d) return `${d} d ${h} h`;
  if (h) return `${h} h ${m} min`;
  if (m) return `${m} min`;
  return `${s} s`;
}
