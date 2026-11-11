// How items are named on the portal (the item service sends keys and numbers).
import type { Edition, Item } from '@/shared/api';

export const RARITY_NAMES = ['', 'Common', 'Uncommon', 'Rare', 'Legendary'] as const;
export const EDITION_NAMES: Record<Edition, string> = {
  base: 'Base', foil: 'Foil', holographic: 'Holographic', polychrome: 'Polychrome', negative: 'Negative',
};
const STAKE_NAMES = ['', 'White', 'Red', 'Green', 'Black', 'Blue', 'Purple', 'Orange', 'Gold'];
const SOURCES: Record<string, string> = {
  weekly: 'the weekly drop',
  weekly_win: 'the weekly win',
  first_deck_win: 'a first win with a deck',
  first_stake_win: 'a first win at a stake',
  gift: 'a gift from the developers',
};

export const stake_label = (stake: number) => `${STAKE_NAMES[stake] ?? stake} Stake`;
export const source_label = (source: string) => SOURCES[source] ?? source;

/** "1 in 4,520" */
export const odds_label = (odds: number) => (odds > 0 ? `1 in ${odds.toLocaleString('en')}` : 'unknown odds');

/** "Blueprint, Rare, Negative, #3 of 7" (for screen readers and titles) */
export function item_label(item: Item): string {
  const parts = [item.name, RARITY_NAMES[item.rarity]];
  if (item.edition !== 'base') parts.push(EDITION_NAMES[item.edition]);
  parts.push(`#${item.serial} of ${item.minted}`);
  return parts.join(', ');
}
