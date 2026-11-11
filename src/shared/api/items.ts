// The item service (BalatroItemService): the players' collectible items
// (jokers and tags with the game's editions), their trades and the casino.
import { ITEMS_BASE } from '@/shared/config';
import { read_json } from './problem';
import { authorized_fetch } from './session';

export type Edition = 'base' | 'foil' | 'holographic' | 'polychrome' | 'negative';
export type TradeBox = 'all' | 'incoming' | 'outgoing';
export type TradeStatus = 'pending' | 'accepted' | 'declined' | 'cancelled' | 'expired';
export type GameMode = 'coinflip' | 'jackpot';
export type GameStatus = 'open' | 'done' | 'cancelled';
export type Side = 'chips' | 'mult';

export interface ItemSprite { atlas: string; pos: { x: number; y: number }; soul_pos?: { x: number; y: number } | null }

export interface Item {
  id: string;
  kind: 'joker' | 'tag';
  key: string;
  name: string;
  edition: Edition;
  /** 1 Common, 2 Uncommon, 3 Rare, 4 Legendary */
  rarity: 1 | 2 | 3 | 4;
  /** the stake of the win it came from (1 White ... 8 Gold) */
  stake: number | null;
  serial: number;
  minted: number;
  /** one in this many drops: higher is rarer */
  odds: number;
  owner: string;
  owner_name: string | null;
  source: string;
  source_run: string | null;
  found_at: string;
  acquired_at: string;
  tradable_at: string;
  /** out of its trade hold and not staked */
  tradable: boolean;
  /** the casino game it is staked in (it can't change hands until the game ends) */
  staked: string | null;
  sprite: ItemSprite | null;
}

export interface Week { week: string; weekly_found: boolean; weekly_win_found: boolean; next_week_at: string }

export interface ItemsMe {
  id: string;
  name: string | null;
  can_trade: boolean;
  admin: boolean;
  items: number;
  showcase: Item | null;
  week: Week;
}

export interface ItemsPlayer { id: string; name: string | null; you: boolean; can_trade: boolean; items: number; showcase: Item | null }

export interface Transfer {
  from_player: string | null;
  from_name: string | null;
  to_player: string;
  to_name: string | null;
  at: string;
  trade: string | null;
  /** the casino game it was won in */
  game: string | null;
}

export interface Trade {
  id: string;
  sender: string;
  sender_name: string | null;
  recipient: string;
  recipient_name: string | null;
  give: Item[];
  take: Item[];
  message: string;
  status: TradeStatus;
  available: boolean;
  created_at: string;
  updated_at: string;
  expires_at: string;
}

export interface Odds {
  rules: { source: string; table: string; description: string }[];
  tables: { name: string; kinds: Record<string, number>; rarities: Record<string, number>; editions: Record<string, number> }[];
  pools: Record<string, Record<string, number>>;
  trade_hold_days: number;
  offer_days: number;
}

export interface GameEntry {
  player: string;
  player_name: string | null;
  items: Item[];
  /** the items' value (their odds) when they were staked */
  value: number;
  /** percent of the pot */
  chance: number;
  /** its part of the pot: from low (included) to high (excluded) */
  low: number;
  high: number;
  seed: string;
  at: string;
}

export interface CasinoGame {
  id: string;
  mode: GameMode;
  status: GameStatus;
  /** a coinflip's first player's side (the second has the other) */
  side: Side | null;
  entries: GameEntry[];
  value: number;
  /** SHA-256 of the server seed, shown from the start */
  seed_hash: string;
  /** shown once the game is over */
  server_seed: string | null;
  /** the point of the pot that won */
  roll: number | null;
  winner: string | null;
  winner_name: string | null;
  /** an open coinflip: what the other player's items must be worth together */
  join_min: number | null;
  join_max: number | null;
  created_at: string;
  updated_at: string;
  /** when a jackpot is drawn (once two players are in) */
  closes_at: string | null;
}

export interface JackpotState {
  /** the pot taking items (null: the next item opens one) */
  round: CasinoGame | null;
  last: CasinoGame | null;
  /** the service's time */
  now: string;
}

export interface CasinoRules {
  open: boolean;
  max_items: number;
  coinflip_margin: number;
  max_open_coinflips: number;
  jackpot_seconds: number;
  jackpot_max_players: number;
  jackpot_max_items: number;
  trade_hold_days: number;
}

export interface Bet { items: string[]; seed?: string }

const url = (path: string) => `${ITEMS_BASE}${path}`;
const json = { 'content-type': 'application/json' };
const id = encodeURIComponent;
const get = <T,>(path: string) => authorized_fetch(url(path)).then((r) => read_json<T>(r));
const send = <T,>(method: string, path: string, body?: unknown) =>
  authorized_fetch(url(path), { method, headers: json, body: body === undefined ? undefined : JSON.stringify(body) })
    .then((r) => read_json<T>(r));

export const items_api = {
  odds: () => fetch(url('/v1/odds')).then((r) => read_json<Odds>(r)),
  me: () => get<ItemsMe>('/v1/me'),
  /** finds the items the player's runs have earned (once each) */
  find: () => send<{ found: Item[]; week: Week }>('POST', '/v1/me/drops'),
  mine: () => get<Item[]>('/v1/me/items'),
  showcase: (item: string | null) => send<ItemsMe>('PUT', '/v1/me/showcase', { item }),
  item: (item: string) => get<{ item: Item; history: Transfer[] }>(`/v1/items/${id(item)}`),
  player: (player: string) => get<ItemsPlayer>(`/v1/players/${id(player)}`),
  player_items: (player: string) => get<Item[]>(`/v1/players/${id(player)}/items`),
  find_players: (q: string) => get<ItemsPlayer[]>(`/v1/players?q=${id(q)}`),
  trades: (box: TradeBox = 'all') => get<Trade[]>(`/v1/trades?box=${box}`),
  trade: (trade: string) => get<Trade>(`/v1/trades/${id(trade)}`),
  offer: (offer: { to: string; give: string[]; take: string[]; message: string }) => send<Trade>('POST', '/v1/trades', offer),
  answer: (trade: string, answer: 'accept' | 'decline' | 'cancel') => send<Trade>('POST', `/v1/trades/${id(trade)}/${answer}`),
  casino_rules: () => fetch(url('/v1/casino/rules')).then((r) => read_json<CasinoRules>(r)),
  coinflips: () => get<CasinoGame[]>('/v1/casino/coinflips'),
  create_coinflip: (bet: Bet & { side: Side }) => send<CasinoGame>('POST', '/v1/casino/coinflips', bet),
  join_coinflip: (game: string, bet: Bet) => send<CasinoGame>('POST', `/v1/casino/coinflips/${id(game)}/join`, bet),
  cancel_coinflip: (game: string) => send<CasinoGame>('POST', `/v1/casino/coinflips/${id(game)}/cancel`),
  jackpot: () => get<JackpotState>('/v1/casino/jackpot'),
  join_jackpot: (bet: Bet) => send<CasinoGame>('POST', '/v1/casino/jackpot', bet),
  leave_jackpot: () => send<CasinoGame>('POST', '/v1/casino/jackpot/leave'),
  /** games that are over, the last first (`player`: only theirs) */
  casino_games: (player?: string, limit = 20) =>
    get<CasinoGame[]>(`/v1/casino/games?limit=${limit}${player ? `&player=${id(player)}` : ''}`),
  casino_game: (game: string) => get<CasinoGame>(`/v1/casino/games/${id(game)}`),
};
