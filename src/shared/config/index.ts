// Where the other parts of the site are. By default everything is on this
// origin: the game at /play/, the game API at /api/, the identity service at
// /identity/ (the portal's nginx, or its dev server, passes them on).

function env(name: string): string {
  return ((import.meta.env as Record<string, string | undefined>)[name] ?? '').replace(/\/$/, '');
}

/** the game API (BalatroWebAPI): `<api_base>/api/v1/...` */
export const API_BASE = env('VITE_API_URL');
/** the identity service (BalatroIndentityService) */
export const IDENTITY_BASE = env('VITE_IDENTITY_URL') || '/identity';
/** the game (BalatroFrontEnd) */
export const GAME_URL = env('VITE_GAME_URL') || '/play';

/** the page Google sends the browser back to (one of the identity service's OAUTH_REDIRECT_URIS) */
export function oauth_redirect_uri(): string {
  return `${window.location.origin}/auth/callback`;
}
