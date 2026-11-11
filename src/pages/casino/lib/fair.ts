// The casino's draws are provably fair (BalatroItemService, domain/casino.py):
// the SHA-256 of the server seed is shown from the start, and once the game is
// over its server seed gives the roll, HMAC-SHA256(key = server seed,
// message = "<game id>:<seed 1>:<seed 2>..."). This checks it in the browser,
// without trusting the service's numbers.
import type { CasinoGame } from '@/shared/api';

const bytes = (s: string) => new TextEncoder().encode(s);
const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

export interface DrawCheck {
  /** the server seed is the one whose hash was shown */
  hash: boolean;
  /** the pot is the sum of the entries */
  value: boolean;
  /** the roll and the winner, computed here */
  roll: number;
  winner: string | null;
  ok: boolean;
}

/** null: the game isn't over (its server seed is still secret) */
export async function check_draw(game: CasinoGame): Promise<DrawCheck | null> {
  if (!game.server_seed || game.status !== 'done') return null;
  const hash = hex(await crypto.subtle.digest('SHA-256', bytes(game.server_seed))) === game.seed_hash;
  const key = await crypto.subtle.importKey('raw', bytes(game.server_seed), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const message = [game.id, ...game.entries.map((e) => e.seed)].join(':');
  const digest = hex(await crypto.subtle.sign('HMAC', key, bytes(message)));
  const value = game.entries.reduce((sum, e) => sum + e.value, 0);
  const roll = Number((BigInt(`0x${digest.slice(0, 13)}`) * BigInt(value)) / 16n ** 13n);
  // the entries' values laid end to end, in order: the one holding the roll wins
  let low = 0;
  let winner: string | null = null;
  for (const e of game.entries) {
    if (roll >= low && roll < low + e.value) {
      winner = e.player;
      break;
    }
    low += e.value;
  }
  const ok = hash && value === game.value && roll === game.roll && winner === game.winner;
  return { hash, value: value === game.value, roll, winner, ok };
}

/** a seed of the player's own for the draw (16 hex digits) */
export function new_seed(): string {
  return [...crypto.getRandomValues(new Uint8Array(8))].map((b) => b.toString(16).padStart(2, '0')).join('');
}
