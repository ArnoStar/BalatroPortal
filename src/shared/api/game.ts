// The game API (BalatroWebAPI): only what the portal shows (the player's runs,
// statistics, leaderboards, names from the catalog). Playing is the game's
// (BalatroFrontEnd).
import { API_BASE } from '@/shared/config';
import { read_json } from './problem';
import { authorized_fetch } from './session';

export type Phase = 'blind_select' | 'playing' | 'round_eval' | 'shop' | 'pack' | 'game_over';

export interface RunSummary {
  id: string;
  version: number;
  settings: { seed: string; deck: string; stake: number; challenge: string | null; game_speed: number; seeded?: boolean };
  phase: Phase;
  ante: number;
  round: number;
  dollars: number;
  won: boolean;
  created_at: string;
  updated_at: string;
  /** the run's best single hand */
  best_hand?: Score;
  /** counts for statistics and leaderboards (not seeded, no challenge, no debug command) */
  counted?: boolean;
}

/** a score; "inf" or "nan" past the largest number (the game shows "naneinf") */
export type Score = number | string;

export interface UsageCount { key: string; count: number }

export interface PlayerStats {
  runs: { total: number; counted: number; won: number; lost: number; in_progress: number };
  high_scores: {
    best_hand: Score; highest_round: number; highest_ante: number; most_money: number; boss_streak: number;
    best_win_streak: number; current_win_streak: number; most_played_hand: UsageCount | null;
  };
  career: {
    wins: number; losses: number; rounds: number; hands_played: number; cards_played: number; face_cards_played: number;
    cards_discarded: number; dollars_earned: number; shop_dollars_spent: number; shop_rerolls: number; jokers_sold: number;
    cards_sold: number; tarots_bought: number; planets_bought: number; playing_cards_bought: number; vouchers_bought: number;
    tarot_readings_used: number; planetariums_used: number;
  };
  hands: UsageCount[];
  jokers: { key: string; runs: number; rounds: number; wins: number; losses: number; best_stake_won: number | null }[];
  consumables: UsageCount[];
  vouchers: UsageCount[];
  decks: {
    deck: string; runs: number; wins: number; losses: number; best_stake_won: number | null;
    stakes: { stake: number; runs: number; wins: number; losses: number }[];
  }[];
  activity: { date: string; runs: number; wins: number }[];
}

export const BOARDS = ['best_hand', 'highest_ante', 'highest_round', 'most_money', 'boss_streak', 'wins'] as const;
export type BoardName = (typeof BOARDS)[number];

export interface LeaderboardEntry {
  rank: number;
  player: string | null;
  /** the player's profile (/players/:id) */
  player_id?: string | null;
  you: boolean;
  value: Score;
  deck: string | null;
  stake: number | null;
  won: boolean | null;
  achieved_at: string;
}

export interface Leaderboard {
  board: BoardName;
  deck: string | null;
  stake: number | null;
  players: number;
  entries: LeaderboardEntry[];
  you: LeaderboardEntry | null;
}

export interface GlobalStats {
  players: number; runs: number; won: number; lost: number; hands_played: number; cards_played: number;
  dollars_earned: number; best_hand: Score; highest_ante: number;
  decks: { deck: string; runs: number; wins: number }[];
  stakes: { stake: number; runs: number; wins: number }[];
  jokers: { key: string; runs: number; win_runs: number }[];
  hands: UsageCount[];
}

/** the parts of GET /catalog the portal reads: names by key */
export interface Catalog {
  decks: CatalogItem[]; jokers: CatalogItem[]; tarots: CatalogItem[]; planets: CatalogItem[];
  spectrals: CatalogItem[]; vouchers: CatalogItem[];
  challenges?: { id: string; name: string }[];
}

/** the player's progress, as the game's profile keeps it (what is unlocked and discovered) */
export interface ProgressView {
  all_unlocked: boolean;
  can_unlock_all: boolean;
  unlocked: string[];
  discovered: string[];
  challenges_completed: string[];
  challenges_unlocked: number;
  deck_stakes: Record<string, number>;
  max_stakes: Record<string, number>;
}

export interface MeView { id: string; name: string | null; private: boolean; progress: ProgressView }

export interface CollectionCount { found: number; total: number }

export interface CollectionView {
  jokers: CollectionCount; tarots: CollectionCount; planets: CollectionCount; spectrals: CollectionCount;
  vouchers: CollectionCount; boosters: CollectionCount; editions: CollectionCount; blinds: CollectionCount;
  tags: CollectionCount; decks: CollectionCount; challenges: CollectionCount;
  deck_stakes: Record<string, number>;
}

/** a player's public profile; a private one (not yours) has only the name */
export interface PlayerProfile {
  id: string;
  name: string | null;
  you: boolean;
  private: boolean;
  stats: PlayerStats | null;
  collection: CollectionView | null;
  runs: RunSummary[];
}
export interface CatalogItem { key: string; name: string }

export interface Health {
  status: string;
  api_version: string;
  engine_version: string;
  game_version: string;
  /** "required" when the game routes need a signed-in player */
  auth?: 'required' | 'off';
}

export const game_api = {
  health: () => fetch(`${API_BASE}/api/v1/health`).then((res) => read_json<Health>(res)),
  runs: (limit = 20) => authorized_fetch(`${API_BASE}/api/v1/games?limit=${limit}`).then((res) => read_json<RunSummary[]>(res)),
  player_stats: () => authorized_fetch(`${API_BASE}/api/v1/stats/me`).then((res) => read_json<PlayerStats>(res)),
  global_stats: () => authorized_fetch(`${API_BASE}/api/v1/stats/global`).then((res) => read_json<GlobalStats>(res)),
  leaderboard: (board: BoardName, filters: { deck?: string; stake?: number; limit?: number } = {}) => {
    const q = new URLSearchParams({ limit: String(filters.limit ?? 50) });
    if (filters.deck) q.set('deck', filters.deck);
    if (filters.stake) q.set('stake', String(filters.stake));
    return authorized_fetch(`${API_BASE}/api/v1/leaderboards/${board}?${q}`).then((res) => read_json<Leaderboard>(res));
  },
  catalog: () => fetch(`${API_BASE}/api/v1/catalog`).then((res) => read_json<Catalog>(res)),
  me: () => authorized_fetch(`${API_BASE}/api/v1/players/me`).then((res) => read_json<MeView>(res)),
  update_me: (changes: { private?: boolean; all_unlocked?: boolean }) =>
    authorized_fetch(`${API_BASE}/api/v1/players/me`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(changes),
    }).then((res) => read_json<MeView>(res)),
  player: (id: string) =>
    authorized_fetch(`${API_BASE}/api/v1/players/${encodeURIComponent(id)}`).then((res) => read_json<PlayerProfile>(res)),
  delete_run: (id: string) => authorized_fetch(`${API_BASE}/api/v1/games/${id}`, { method: 'DELETE' }).then((res) => read_json<void>(res)),
};
