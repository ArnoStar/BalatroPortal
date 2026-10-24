/** Where to go after signing in: only a path on this site (no open redirect). */
export function safe_next(next: string | null | undefined, fallback = '/'): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return fallback;
  return next;
}
