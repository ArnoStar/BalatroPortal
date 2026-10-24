// Between registering (or a login refused for an unverified email) and
// confirming the email, the password is kept in memory only, so the player is
// signed in right after the code without typing it again. (Never in the URL or
// the history state, which the browser may write to disk.)
let pending: { email: string; password: string } | null = null;

export function remember_credentials(email: string, password: string) {
  pending = { email: email.trim().toLowerCase(), password };
}

export function take_credentials(email: string): string | null {
  const p = pending;
  pending = null;
  return p && p.email === email.trim().toLowerCase() ? p.password : null;
}

const OAUTH_NEXT = 'balatro.oauth_next';

/** where to go after the provider's sign-in (kept across the redirect) */
export function remember_oauth_next(next: string) {
  try {
    sessionStorage.setItem(OAUTH_NEXT, next);
  } catch {
    /* no storage: back to the home page */
  }
}

export function take_oauth_next(): string | null {
  try {
    const next = sessionStorage.getItem(OAUTH_NEXT);
    sessionStorage.removeItem(OAUTH_NEXT);
    return next;
  } catch {
    return null;
  }
}
