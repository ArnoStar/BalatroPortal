// The names the game shows for a run's settings and screen.
import type { Phase } from '@/shared/api';

const DECKS: Record<string, string> = {
  b_red: 'Red Deck', b_blue: 'Blue Deck', b_yellow: 'Yellow Deck', b_green: 'Green Deck', b_black: 'Black Deck',
  b_magic: 'Magic Deck', b_nebula: 'Nebula Deck', b_ghost: 'Ghost Deck', b_abandoned: 'Abandoned Deck',
  b_checkered: 'Checkered Deck', b_zodiac: 'Zodiac Deck', b_painted: 'Painted Deck', b_anaglyph: 'Anaglyph Deck',
  b_plasma: 'Plasma Deck', b_erratic: 'Erratic Deck', b_challenge: 'Challenge Deck',
};

export const STAKES = ['White', 'Red', 'Green', 'Black', 'Blue', 'Purple', 'Orange', 'Gold'] as const;

const PHASES: Record<Phase, string> = {
  blind_select: 'Choosing a blind', playing: 'Playing a blind', round_eval: 'Cashing out', shop: 'In the shop',
  pack: 'Opening a pack', game_over: 'Over',
};

export const deck_name = (key: string) => DECKS[key] ?? key;
export const stake_name = (stake: number) => `${STAKES[stake - 1] ?? stake} Stake`;
export const phase_name = (phase: Phase) => PHASES[phase] ?? phase;
