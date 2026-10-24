// The game API (BalatroWebAPI): only what the portal shows (the player's runs).
// Playing is the game's (BalatroFrontEnd).
import { API_BASE } from '@/shared/config';
import { read_json } from './problem';
import { authorized_fetch } from './session';

export type Phase = 'blind_select' | 'playing' | 'round_eval' | 'shop' | 'pack' | 'game_over';

export interface RunSummary {
  id: string;
  version: number;
  settings: { seed: string; deck: string; stake: number; challenge: string | null; game_speed: number };
  phase: Phase;
  ante: number;
  round: number;
  dollars: number;
  won: boolean;
  created_at: string;
  updated_at: string;
}

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
  delete_run: (id: string) => authorized_fetch(`${API_BASE}/api/v1/games/${id}`, { method: 'DELETE' }).then((res) => read_json<void>(res)),
};
