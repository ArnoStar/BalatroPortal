// How the casino's games are named and coloured on the portal.
import type { CasinoGame, GameMode, Side } from '@/shared/api';

export const MODE_NAMES: Record<GameMode, string> = { coinflip: 'Coinflip', jackpot: 'Jackpot' };
export const SIDE_NAMES: Record<Side, string> = { chips: 'Chips', mult: 'Mult' };

// one colour per player, in the order they came in: the dataviz palette's eight
// categorical slots (validated on the panels' surface); a ninth player and
// after share the neutral "other" (their names and chances are listed beside)
const COLOURS = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'];
const OTHER = '#6b6584';

export function player_colours(game: CasinoGame): Record<string, string> {
  const out: Record<string, string> = {};
  for (const e of game.entries) {
    const n = Object.keys(out).length;
    out[e.player] ??= n < COLOURS.length ? COLOURS[n] : OTHER;
  }
  return out;
}

/** the side a coinflip landed on (null: not flipped) */
export function landed_side(game: CasinoGame): Side | null {
  if (game.mode !== 'coinflip' || !game.winner || !game.side) return null;
  const first = game.entries[0]?.player;
  return game.winner === first ? game.side : game.side === 'chips' ? 'mult' : 'chips';
}

/** an amount of value: "1,234" */
export const value_label = (value: number) => value.toLocaleString('en');
