// How the casino's games are named and coloured on the portal.
import type { CasinoGame, GameMode, Side } from '@/shared/api';

export const MODE_NAMES: Record<GameMode, string> = { coinflip: 'Coinflip', jackpot: 'Jackpot' };
export const SIDE_NAMES: Record<Side, string> = { chips: 'Chips', mult: 'Mult' };

// the game's colours, one per player in the order they came in
const COLOURS = ['#009dff', '#fe5f55', '#fda200', '#4bc292', '#b26cbb', '#eac058', '#5fd3e8', '#ff8fb1', '#9bd35a', '#c9d3d5'];

export function player_colours(game: CasinoGame): Record<string, string> {
  const out: Record<string, string> = {};
  for (const e of game.entries) out[e.player] ??= COLOURS[Object.keys(out).length % COLOURS.length];
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
