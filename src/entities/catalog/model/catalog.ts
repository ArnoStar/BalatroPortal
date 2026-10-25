// The game's names for jokers, consumables and vouchers, from the API's
// catalog (loaded once per page load, and only when a page needs it).
import { useEffect, useState } from 'react';
import { game_api, type Catalog } from '@/shared/api';

let loading: Promise<Map<string, string>> | null = null;

function load_names(): Promise<Map<string, string>> {
  loading ??= game_api.catalog().then(
    (c: Catalog) => new Map([c.decks, c.jokers, c.tarots, c.planets, c.spectrals, c.vouchers].flat().map((i) => [i.key, i.name])),
    (err: unknown) => {
      loading = null; // try again next time
      throw err;
    },
  );
  return loading;
}

/** `name(key)`: the game's name for a card or deck key (the key itself until the catalog is there) */
export function useCatalogNames(): (key: string) => string {
  const [names, setNames] = useState<Map<string, string> | null>(null);
  useEffect(() => {
    let live = true;
    load_names().then(
      (n) => live && setNames(n),
      () => undefined,
    );
    return () => {
      live = false;
    };
  }, []);
  return (key: string) => names?.get(key) ?? key;
}
