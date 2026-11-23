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
  /** their PvP and coop matches (null: none yet) */
  multiplayer?: MultiplayerStats | null;
  matches?: MatchHistoryEntry[];
}

export type MatchMode = 'pvp' | 'coop';
export interface MatchPlayer { seat: number; name: string | null; you: boolean; host: boolean; left: boolean; id?: string | null }
export interface MatchSummaryPlayer {
  seat: number; name: string | null; best_hand: Score;
  hp?: number | null; damage_dealt?: number | null; damage_taken?: number | null; biggest_hit?: number | null;
  rounds_won?: number | null; rounds_lost?: number | null;
  hands?: number | null; chips?: Score | null; best_hand_name?: string | null; discards?: number | null;
}
/** a multiplayer match the player played (finished) */
export interface MatchHistoryEntry {
  id: string; mode: MatchMode; settings: { deck: string; stake: number; seed: string | null; timer: number }; seed: string | null;
  created_at: string; finished_at: string | null; seat: number; players: MatchPlayer[];
  result: { winner: number | null; you_won: boolean; reason: string };
  summary: { ante: number; rounds: number; run_won: boolean | null; players: MatchSummaryPlayer[] } | null;
  /** by seat: the runs to watch again (coop: the same run twice) */
  runs: (string | null)[];
}
export interface MatchOpponentStats { id: string; name: string | null; played: number; won: number; lost: number; best_ante: number }
export interface MultiplayerStats {
  pvp: {
    played: number; won: number; lost: number; drawn: number; gave_up: number; opponent_left: number; streak: number;
    best_streak: number; damage_dealt: number; damage_taken: number; biggest_hit: number; best_ante: number;
  };
  coop: { played: number; runs_won: number; best_ante: number; best_round: number; hands: number; chips: Score; best_hand: Score; best_hand_name: string | null };
  rivals: MatchOpponentStats[];
  partners: MatchOpponentStats[];
}
export const MULTIPLAYER_BOARDS = ['pvp_wins', 'pvp_streak', 'pvp_biggest_hit', 'coop_ante', 'coop_wins', 'coop_best_hand'] as const;
export type MultiplayerBoardName = (typeof MULTIPLAYER_BOARDS)[number];
export interface MultiplayerBoardPlayer { id: string; name: string | null; you: boolean }
/** a player's best (coop_ante: a pair of coop partners' best run together) */
export interface MultiplayerLeaderboardEntry {
  rank: number;
  /** the player, or the coop pair (coop_ante) */
  players: MultiplayerBoardPlayer[];
  you: boolean;
  value: Score;
  /** the matches of the board's mode they played (a pair: together) */
  played: number;
  /** coop_ante: the rounds that run went */
  rounds?: number | null;
  /** coop_best_hand: the poker hand */
  hand?: string | null;
  achieved_at: string;
}
export interface MultiplayerLeaderboard {
  board: MultiplayerBoardName;
  players: number;
  entries: MultiplayerLeaderboardEntry[];
  you: MultiplayerLeaderboardEntry | null;
}
/** everyone's finished matches together */
export interface MultiplayerGlobalStats {
  players: number;
  matches: number;
  pvp: { matches: number; drawn: number; left: number; rounds: number; best_ante: number; average_ante: number; damage: number; biggest_hit: number };
  coop: { matches: number; runs_won: number; best_ante: number; average_ante: number; hands: number; chips: Score; best_hand: Score; best_hand_name: string | null };
  decks: { deck: string; pvp: number; coop: number }[];
  /** the last 30 days, oldest first (YYYY-MM-DD, UTC) */
  days: { day: string; pvp: number; coop: number }[];
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
  /** your PvP and coop numbers */
  multiplayer_stats: () => authorized_fetch(`${API_BASE}/api/v1/matches/stats`).then((res) => read_json<MultiplayerStats>(res)),
  /** the best of everyone's finished matches on a board */
  multiplayer_leaderboard: (board: MultiplayerBoardName, limit = 50) =>
    authorized_fetch(`${API_BASE}/api/v1/matches/leaderboards/${board}?limit=${limit}`).then((res) => read_json<MultiplayerLeaderboard>(res)),
  /** everyone's finished matches together */
  multiplayer_global: () =>
    authorized_fetch(`${API_BASE}/api/v1/matches/stats/global`).then((res) => read_json<MultiplayerGlobalStats>(res)),
  /** your finished matches, the latest first */
  match_history: (limit = 10) =>
    authorized_fetch(`${API_BASE}/api/v1/matches/history?limit=${limit}`).then((res) => read_json<{ matches: MatchHistoryEntry[]; next_before: string | null }>(res)),
  delete_run: (id: string) => authorized_fetch(`${API_BASE}/api/v1/games/${id}`, { method: 'DELETE' }).then((res) => read_json<void>(res)),
};
