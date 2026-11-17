// How items are named on the portal, in the player's language (the item
// service sends keys and numbers; the names are the game's, translated).
import type { Edition, Item } from '@/shared/api';
import { fmt_number, game_name, N_, t } from '@/shared/i18n';

const RARITIES = ['', N_('Common'), N_('Uncommon'), N_('Rare'), N_('Legendary')] as const;
const EDITIONS: Record<Edition, string> = {
  base: N_('Base'), foil: N_('Foil'), holographic: N_('Holographic'), polychrome: N_('Polychrome'), negative: N_('Negative'),
};
const STAKE_NAMES = ['', 'White', 'Red', 'Green', 'Black', 'Blue', 'Purple', 'Orange', 'Gold'];
const SOURCES: Record<string, string> = {
  weekly: N_('the weekly drop'),
  weekly_win: N_('the weekly win'),
  first_deck_win: N_('a first win with a deck'),
  first_stake_win: N_('a first win at a stake'),
  gift: N_('a gift from the developers'),
};

/** Common ... Legendary */
export const rarity_name = (rarity: number) => (RARITIES[rarity] ? t(RARITIES[rarity]) : String(rarity));
/** Base, Foil, Holographic, Polychrome, Negative */
export const edition_name = (edition: Edition) => t(EDITIONS[edition] ?? edition);
/** the item's name in the player's language (the game's) */
export const item_name = (item: Pick<Item, 'key' | 'name'>) => game_name(item.key, item.name);

export const stake_label = (stake: number) => {
  const english = STAKE_NAMES[stake];
  return english ? game_name(`stake_${english.toLowerCase()}`, `${english} Stake`) : String(stake);
};
export const source_label = (source: string) => (SOURCES[source] ? t(SOURCES[source]) : source);

/** "1 in 4,520" */
export const odds_label = (odds: number) => (odds > 0 ? t('1 in {n}', { n: fmt_number(odds) }) : t('unknown odds'));

/** "Blueprint, Rare, Negative, #3 of 7" (for screen readers and titles) */
export function item_label(item: Item): string {
  const parts = [item_name(item), rarity_name(item.rarity)];
  if (item.edition !== 'base') parts.push(edition_name(item.edition));
  parts.push(t('#{serial} of {minted}', { serial: item.serial, minted: item.minted }));
  return parts.join(', ');
}
