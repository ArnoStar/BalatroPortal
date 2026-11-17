// The names the game shows for a run's settings and screen, in the player's
// language (the game's own translations: shared/i18n's game_name).
import type { Phase } from '@/shared/api';
import { game_name, N_, t } from '@/shared/i18n';

const DECKS: Record<string, string> = {
  b_red: 'Red Deck', b_blue: 'Blue Deck', b_yellow: 'Yellow Deck', b_green: 'Green Deck', b_black: 'Black Deck',
  b_magic: 'Magic Deck', b_nebula: 'Nebula Deck', b_ghost: 'Ghost Deck', b_abandoned: 'Abandoned Deck',
  b_checkered: 'Checkered Deck', b_zodiac: 'Zodiac Deck', b_painted: 'Painted Deck', b_anaglyph: 'Anaglyph Deck',
  b_plasma: 'Plasma Deck', b_erratic: 'Erratic Deck', b_challenge: 'Challenge Deck',
};

export const STAKES = ['White', 'Red', 'Green', 'Black', 'Blue', 'Purple', 'Orange', 'Gold'] as const;

const PHASES: Record<Phase, string> = {
  blind_select: N_('Choosing a blind'), playing: N_('Playing a blind'), round_eval: N_('Cashing out'), shop: N_('In the shop'),
  pack: N_('Opening a pack'), game_over: N_('Over'),
};

export const deck_name = (key: string) => game_name(key, DECKS[key] ?? key);
/** the decks a run can be started with, in the game's order */
export const DECK_KEYS = Object.keys(DECKS).filter((k) => k !== 'b_challenge');
export const stake_name = (stake: number) => {
  const english = STAKES[stake - 1];
  return english ? game_name(`stake_${english.toLowerCase()}`, `${english} Stake`) : t('Stake {n}', { n: stake });
};
export const phase_name = (phase: Phase) => (PHASES[phase] ? t(PHASES[phase]) : phase);
