// The player's sign-in, shared with the game (BalatroFrontEnd): both are served
// from one origin (the portal at /, the game at /play/), so they read the same
// localStorage entry. The portal signs in and out; the game only refreshes.
//
// The contract (keep it the same in BalatroFrontEnd's src/shared/api/session.ts):
//   localStorage['balatro.session'] = { access_token, refresh_token, expires_at }
//   (expires_at: the access token's expiry, ms since the epoch). A refresh token
//   works once: refreshes are serialised across tabs with the Web Locks API
//   (lock 'balatro.session'), and whoever holds the lock re-reads the entry first.
import { IDENTITY_BASE } from '@/shared/config';

export const SESSION_KEY = 'balatro.session';
const LOCK = 'balatro.session';
const EARLY_MS = 30_000; // refresh this long before the access token expires

export interface Session {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

/** what the identity service gives at sign-in and refresh */
export interface Tokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export function read_session(): Session | null {
  try {
    const s = JSON.parse(localStorage.getItem(SESSION_KEY) ?? 'null');
    return s && typeof s.access_token === 'string' && typeof s.refresh_token === 'string' ? s : null;
  } catch {
    return null;
  }
}

export function write_session(s: Session | null) {
  try {
    if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    /* no storage */
  }
}

export function save_tokens(t: Tokens): Session {
  const s = { access_token: t.access_token, refresh_token: t.refresh_token, expires_at: Date.now() + t.expires_in * 1000 };
  write_session(s);
  return s;
}

function with_lock<T>(fn: () => Promise<T>): Promise<T> {
  const locks = (navigator as Navigator & { locks?: LockManager }).locks;
  return locks ? (locks.request(LOCK, fn) as Promise<T>) : fn();
}

/** A fresh session, or null when signed out. `failed` is an access token a
 * service refused: it is replaced even if it hasn't expired yet. Network
 * errors keep the session (and throw). */
export function refresh_session(failed?: string): Promise<Session | null> {
  return with_lock(async () => {
    const s = read_session();
    if (!s) return null;
    const stale = failed !== undefined ? s.access_token === failed : s.expires_at - Date.now() < EARLY_MS;
    if (!stale) return s; // (another tab refreshed it meanwhile)
    const res = await fetch(`${IDENTITY_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refresh_token: s.refresh_token }),
    });
    if (res.status === 400 || res.status === 401 || res.status === 422) {
      write_session(null);
      return null;
    }
    if (!res.ok) throw new Error(`the sign-in service answered ${res.status}`);
    return save_tokens(await res.json());
  });
}

/** a valid access token, or null when signed out */
export async function access_token(): Promise<string | null> {
  const s = read_session();
  if (!s) return null;
  if (s.expires_at - Date.now() >= EARLY_MS) return s.access_token;
  return (await refresh_session())?.access_token ?? null;
}

/** `fetch` with the player's access token; a refused token is refreshed once */
export async function authorized_fetch(url: string, init: RequestInit = {}): Promise<Response> {
  const send = (token: string | null) => {
    const headers = new Headers(init.headers);
    if (token) headers.set('authorization', `Bearer ${token}`);
    return fetch(url, { ...init, headers });
  };
  const token = await access_token();
  const res = await send(token);
  if (res.status !== 401 || !token) return res;
  const fresh = await refresh_session(token);
  return fresh ? send(fresh.access_token) : res;
}
