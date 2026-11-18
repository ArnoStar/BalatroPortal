// The game's own words in a language (its localization, served by the game at
// /play/localization/<language>.json): the names of decks, stakes, cards,
// enhancements, seals, poker hands, challenges, ranks and suits, for the
// portal to show in that language.
import { GAME_URL } from '@/shared/config';

export interface GameText {
  /** a card's, deck's, stake's, tag's or voucher's name by its key (j_joker, b_red, stake_white, tag_foil ...) */
  names: Record<string, string>;
  /** a poker hand's name by its English name (Flush, Two Pair ...) */
  hands: Record<string, string>;
  /** a challenge's name by its id (c_omelette_1 ...) */
  challenges: Record<string, string>;
  /** a playing card's rank (2 ... 10, Jack, Queen, King, Ace) and suit (Spades ...) by their English names */
  ranks: Record<string, string>;
  suits: Record<string, string>;
}

type Raw = {
  descriptions?: Record<string, Record<string, { name?: string }>>;
  misc?: {
    poker_hands?: Record<string, string>;
    challenge_names?: Record<string, string>;
    ranks?: Record<string, string>;
    suits_plural?: Record<string, string>;
  };
};

/** null: the game doesn't answer (the names stay English) */
export async function load_game_text(language: string): Promise<GameText | null> {
  try {
    const r = await fetch(`${GAME_URL}/localization/${encodeURIComponent(language)}.json`);
    if (!r.ok) return null;
    const raw = (await r.json()) as Raw;
    const names: Record<string, string> = {};
    for (const set of Object.values(raw.descriptions ?? {})) {
      for (const [key, d] of Object.entries(set ?? {})) if (d?.name) names[key] = d.name;
    }
    return {
      names, hands: raw.misc?.poker_hands ?? {}, challenges: raw.misc?.challenge_names ?? {}, ranks: raw.misc?.ranks ?? {},
      suits: raw.misc?.suits_plural ?? {},
    };
  } catch {
    return null;
  }
}
