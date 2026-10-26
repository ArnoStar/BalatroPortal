import { GAME_URL } from '@/shared/config';

/**
 * Where to go after signing in: only a path on this site (no open redirect).
 * Signing in leads to the home page, also from the game: only a link into
 * the game (a replay, a bug report: /play/?...) is followed there.
 */
export function safe_next(next: string | null | undefined, fallback = '/'): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return fallback;
  if (next === GAME_URL || next === `${GAME_URL}/`) return fallback;
  return next;
}
