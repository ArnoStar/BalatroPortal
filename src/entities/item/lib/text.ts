// How items are named on the portal, in the player's language (the item
// service sends keys and numbers; the names are the game's, translated).
import type { Booster, BoosterSize, Drawable, Edition, Item, ItemKind, Tier } from '@/shared/api';
import { fmt_number, game_name, N_, rank_name, suit_name, t } from '@/shared/i18n';

const RARITIES = ['', N_('Common'), N_('Uncommon'), N_('Rare'), N_('Legendary')] as const;
const EDITIONS: Record<Edition, string> = {
  base: N_('Base'), foil: N_('Foil'), holographic: N_('Holographic'), polychrome: N_('Polychrome'), negative: N_('Negative'),
};
const KINDS: Record<ItemKind, string> = {
  joker: N_('Joker'), tarot: N_('Tarot card'), planet: N_('Planet card'), spectral: N_('Spectral card'), card: N_('Playing card'),
};
const KINDS_PLURAL: Record<ItemKind, string> = {
  joker: N_('Jokers'), tarot: N_('Tarot cards'), planet: N_('Planet cards'), spectral: N_('Spectral cards'), card: N_('Playing cards'),
};
const TIERS: Record<Tier, string> = { standard: N_('Standard'), boosted: N_('Boosted'), premium: N_('Premium') };
const SIZES: Record<BoosterSize, string> = { normal: N_('Normal'), jumbo: N_('Jumbo'), mega: N_('Mega') };
const STAKE_NAMES = ['', 'White', 'Red', 'Green', 'Black', 'Blue', 'Purple', 'Orange', 'Gold'];
const SOURCES: Record<string, string> = {
  booster: N_('a booster'),
  weekly: N_('the weekly drop'),
  weekly_win: N_('the weekly win'),
  first_deck_win: N_('a first win with a deck'),
  first_stake_win: N_('a first win at a stake'),
  gift: N_('a gift from the developers'),
};
// a playing card's key: its suit's letter and its rank's (S_A: the Ace of Spades)
const SUITS: Record<string, string> = { S: 'Spades', H: 'Hearts', D: 'Diamonds', C: 'Clubs' };
const RANKS: Record<string, string> = { T: '10', J: 'Jack', Q: 'Queen', K: 'King', A: 'Ace' };
const ENHANCEMENTS: Record<string, string> = {
  m_bonus: 'Bonus Card', m_mult: 'Mult Card', m_wild: 'Wild Card', m_glass: 'Glass Card', m_steel: 'Steel Card',
  m_stone: 'Stone Card', m_gold: 'Gold Card', m_lucky: 'Lucky Card',
};

/** Common ... Legendary */
export const rarity_name = (rarity: number) => (RARITIES[rarity] ? t(RARITIES[rarity]) : String(rarity));
/** Base, Foil, Holographic, Polychrome, Negative */
export const edition_name = (edition: Edition) => t(EDITIONS[edition] ?? edition);
/** Joker, Tarot card ... (`plural`: Jokers ...) */
export const kind_name = (kind: ItemKind, plural = false) => t((plural ? KINDS_PLURAL : KINDS)[kind] ?? kind);
export const tier_name = (tier: Tier) => t(TIERS[tier] ?? tier);
export const size_name = (size: BoosterSize) => t(SIZES[size] ?? size);
/** a playing card's enhancement (m_glass: Glass Card) and seal (Red: Red Seal), the game's names */
export const enhancement_name = (key: string) => game_name(key, ENHANCEMENTS[key] ?? key);
export const seal_name = (seal: string) => game_name(`${seal.toLowerCase()}_seal`, `${seal} Seal`);

/** the item's name in the player's language (the game's): a playing card is its rank and suit */
export function item_name(item: Pick<Drawable, 'key' | 'name' | 'kind'>): string {
  if (item.kind === 'card') {
    const [suit, rank] = item.key.split('_');
    if (suit && rank && SUITS[suit]) return t('{rank} of {suit}', { rank: rank_name(RANKS[rank] ?? rank), suit: suit_name(SUITS[suit]) });
  }
  return game_name(item.key, item.name);
}

/** a playing card's enhancement and seal: "Glass Card · Red Seal" ('' for the other cards and a plain one) */
export function upgrades_label(item: Pick<Drawable, 'enhancement' | 'seal'>): string {
  return [item.enhancement ? enhancement_name(item.enhancement) : null, item.seal ? seal_name(item.seal) : null].filter(Boolean).join(' · ');
}

// the game's packs' English names, by their key's middle (p_buffoon_mega_1)
const PACKS: Record<string, string> = {
  buffoon: 'Buffoon Pack', arcana: 'Arcana Pack', celestial: 'Celestial Pack', spectral: 'Spectral Pack', standard: 'Standard Pack',
};

/** the booster's name: the game's pack (Mega Buffoon Pack), and its tier */
export function booster_name(booster: Pick<Booster, 'art' | 'tier'>): string {
  const key = booster.art.replace(/_\d+$/, '');
  const [, pack = '', size = 'normal'] = key.split('_');
  const english = `${size === 'normal' ? '' : `${size[0].toUpperCase()}${size.slice(1)} `}${PACKS[pack] ?? pack}`;
  return t('{pack}, {tier}', { pack: game_name(key, english), tier: tier_name(booster.tier).toLowerCase() });
}

export const stake_label = (stake: number) => {
  const english = STAKE_NAMES[stake];
  return english ? game_name(`stake_${english.toLowerCase()}`, `${english} Stake`) : String(stake);
};
export const source_label = (source: string) => (SOURCES[source] ? t(SOURCES[source]) : source);

/** "1 in 4,520" */
export const odds_label = (odds: number) => (odds > 0 ? t('1 in {n}', { n: fmt_number(odds) }) : t('unknown odds'));

/** "Blueprint, Rare, Negative, #3 of 7" (for screen readers and titles) */
export function item_label(item: Item): string {
  const parts = [item_name(item)];
  const upgrades = upgrades_label(item);
  if (upgrades) parts.push(upgrades);
  parts.push(rarity_name(item.rarity));
  if (item.edition !== 'base') parts.push(edition_name(item.edition));
  parts.push(t('#{serial} of {minted}', { serial: item.serial, minted: item.minted }));
  return parts.join(', ');
}
