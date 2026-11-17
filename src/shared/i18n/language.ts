// The site's language: one for the portal, the casino and the game. The game
// keeps it in its settings (localStorage['balatro-fe.settings'].language, with
// its own keys: en-us, ru, de, fr ...); the portal and the casino read and write
// the same entry, so that a choice made in any of them holds in the others.
// (The same file is in BalatroCasino: keep the two in step.)

const GAME_SETTINGS = 'balatro-fe.settings';

/** the game's language key in the player's settings (null: none chosen yet) */
export function stored_language(): string | null {
  try {
    const s = JSON.parse(localStorage.getItem(GAME_SETTINGS) ?? 'null');
    return s && typeof s === 'object' && typeof s.language === 'string' ? s.language : null;
  } catch {
    return null;
  }
}

/** keeps the choice in the game's settings (its other settings stay as they are) */
export function store_language(game_key: string) {
  try {
    const s = JSON.parse(localStorage.getItem(GAME_SETTINGS) ?? 'null');
    const settings = s && typeof s === 'object' ? s : {};
    localStorage.setItem(GAME_SETTINGS, JSON.stringify({ ...settings, language: game_key }));
  } catch {
    /* no storage */
  }
}

/** the browser's languages, best first: ["ru-ru", "ru", "en-us", "en"] */
export function browser_languages(): string[] {
  const tags = typeof navigator === 'undefined' ? [] : navigator.languages ?? [navigator.language];
  return tags.filter(Boolean).map((t) => String(t).toLowerCase());
}

/** calls `listener` when another tab (or the portal, or the game) changes the language */
export function on_language_change(listener: () => void): () => void {
  const handler = (e: StorageEvent) => {
    if (e.key === GAME_SETTINGS || e.key === null) listener();
  };
  window.addEventListener('storage', handler);
  return () => window.removeEventListener('storage', handler);
}
