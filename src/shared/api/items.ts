// The item service (BalatroItemService): the players' collectible items (the
// game's cards with their upgrades), the coins playing earns, the boosters
// coins buy, the market and trades. (Its casino is BalatroCasino's, at
// /casino/.)
import { ITEMS_BASE } from '@/shared/config';
import { read_json } from './problem';
import { authorized_fetch } from './session';

export type Edition = 'base' | 'foil' | 'holographic' | 'polychrome' | 'negative';
export type ItemKind = 'joker' | 'tarot' | 'planet' | 'spectral' | 'card';
export type Tier = 'standard' | 'boosted' | 'premium';
export type BoosterSize = 'normal' | 'jumbo' | 'mega';
export type TradeBox = 'all' | 'incoming' | 'outgoing';
export type TradeStatus = 'pending' | 'accepted' | 'declined' | 'cancelled' | 'expired';
export type ListingBox = 'selling' | 'sold' | 'bought' | 'all';
export type ListingSort = 'newest' | 'price' | '-price';

export interface SpriteCell { atlas: string; pos: { x: number; y: number } }

export interface ItemSprite extends SpriteCell {
  soul_pos?: { x: number; y: number } | null;
  /** drawn over the card (The Soul's gem) */
  overlay?: SpriteCell | null;
  /** a playing card's rank and suit (none for a Stone Card) */
  front?: SpriteCell | null;
  /** a playing card's seal */
  seal?: SpriteCell | null;
}

/** what is needed to draw a card: an item, or a card in a pack */
export interface Drawable {
  kind: ItemKind;
  key: string;
  name: string;
  edition: Edition;
  rarity: 1 | 2 | 3 | 4;
  enhancement: string | null;
  seal: string | null;
  sprite: ItemSprite | null;
  /** the stake of the win it came from (1 White ... 8 Gold) */
  stake?: number | null;
  /** how well kept its card is: 0 (ruined) ... 1 (pristine); null: not known yet (a pack of before conditions) */
  condition?: number | null;
  /** its condition's name: ruined, battered, worn, played, fine, excellent, mint, pristine */
  grade?: string | null;
  /** coins: its value in perfect condition, and its value (times its condition) */
  mint_value?: number;
  value?: number;
}

export interface Item extends Drawable {
  id: string;
  /** 1 Common, 2 Uncommon, 3 Rare, 4 Legendary */
  rarity: 1 | 2 | 3 | 4;
  stake: number | null;
  /** the card and its upgrades (S_A+m_glass+Red), as serial numbers count them */
  variant: string;
  serial: number;
  minted: number;
  /** one in this many cards of its kind's standard table: how rare it is to find */
  odds: number;
  condition: number;
  grade: string;
  mint_value: number;
  /** coins: its mint value times its condition (what the casino stakes it at) */
  value: number;
  owner: string;
  owner_name: string | null;
  source: string;
  source_run: string | null;
  /** the booster it came from */
  booster: string | null;
  found_at: string;
  acquired_at: string;
  tradable_at: string;
  /** out of its trade hold, not staked, not for sale */
  tradable: boolean;
  /** the casino game it is staked in (it can't change hands until the game ends) */
  staked: string | null;
  /** its open listing on the market, and its price */
  listed: string | null;
  price: number | null;
  /** put in an upgrade (the casino's, against the house): gone, its history kept */
  destroyed_at?: string | null;
  destroyed_in?: string | null;
}

export interface Week {
  week: string;
  weekly_earned: boolean;
  weekly_win_earned: boolean;
  weekly_coins: number;
  weekly_win_coins: number;
  next_week_at: string;
}

export interface ItemsMe {
  id: string;
  name: string | null;
  can_trade: boolean;
  admin: boolean;
  items: number;
  coins: number;
  /** packs bought and not chosen from yet */
  packs: number;
  showcase: Item | null;
  week: Week;
}

export interface Earned { source: string; reason: string; coins: number; run: string | null }

export interface CoinMove { amount: number; balance: number; reason: string; ref: string | null; at: string }

export interface Booster {
  id: string;
  kind: ItemKind;
  tier: Tier;
  size: BoosterSize;
  choices: number;
  picks: number;
  price: number;
  /** the game's pack it looks like (p_buffoon_mega_1 ...) */
  art: string;
  rarities: Record<string, number>;
  editions: Record<string, number>;
}

export interface PackCard extends Drawable {
  index: number;
  variant: string;
  odds: number;
  minted: number;
}

export interface Pack {
  id: string;
  booster: Booster;
  price: number;
  picks: number;
  status: 'open' | 'opened';
  choices: PackCard[];
  chosen: number[];
  items: Item[];
  created_at: string;
  opened_at: string | null;
}

export interface Listing {
  id: string;
  seller: string;
  seller_name: string | null;
  item: Item | null;
  price: number;
  status: 'open' | 'sold' | 'cancelled';
  /** it can be bought now */
  available: boolean;
  buyer: string | null;
  buyer_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface MarketQuery {
  kind?: ItemKind;
  rarity?: number;
  edition?: Edition;
  q?: string;
  seller?: string;
  sort?: ListingSort;
  limit?: number;
  offset?: number;
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
  /** the market listing it was bought from, and its price */
  listing: string | null;
  price: number | null;
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
  rules: { source: string; coins: number; description: string }[];
  boosters: Booster[];
  tables: { kind: ItemKind; tier: Tier; rarities: Record<string, number>; editions: Record<string, number> }[];
  pools: Record<string, Record<string, number>>;
  trade_hold_days: number;
  offer_days: number;
  market_min_price: number;
  market_max_price: number;
  market_max_listings: number;
}

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
  /** the coins the player's runs have earned (each grant once) */
  earn: () => send<{ earned: Earned[]; coins: number; balance: number; week: Week }>('POST', '/v1/me/drops'),
  coins: (limit = 100) => get<{ balance: number; moves: CoinMove[] }>(`/v1/me/coins?limit=${limit}`),
  boosters: () => fetch(url('/v1/boosters')).then((r) => read_json<Booster[]>(r)),
  buy_booster: (booster: string) => send<Pack>('POST', `/v1/boosters/${id(booster)}/buy`),
  packs: (status: 'open' | 'opened' | 'all' = 'open') => get<Pack[]>(status === 'all' ? '/v1/me/packs?status=' : `/v1/me/packs?status=${status}`),
  pack: (pack: string) => get<Pack>(`/v1/packs/${id(pack)}`),
  choose: (pack: string, picks: number[]) => send<Pack>('POST', `/v1/packs/${id(pack)}/choose`, { picks }),
  market: (q: MarketQuery = {}) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(q)) if (v !== undefined && v !== '' && v !== null) params.set(k, String(v));
    return get<Listing[]>(`/v1/market?${params}`);
  },
  sales: (variant: string, edition: Edition, limit = 10) =>
    get<Listing[]>(`/v1/market/sales?variant=${id(variant)}&edition=${edition}&limit=${limit}`),
  my_listings: (box: ListingBox = 'selling') => get<Listing[]>(`/v1/me/listings?box=${box}`),
  listing: (listing: string) => get<Listing>(`/v1/market/${id(listing)}`),
  sell: (item: string, price: number) => send<Listing>('POST', '/v1/market', { item, price }),
  buy: (listing: string) => send<Listing>('POST', `/v1/market/${id(listing)}/buy`),
  take_off: (listing: string) => send<Listing>('POST', `/v1/market/${id(listing)}/cancel`),
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
};
