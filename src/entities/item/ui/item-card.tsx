// An item drawn with the game's own sprites (served by the game at
// /play/resources/textures): its card (a joker, a tarot, planet or spectral
// card, or a playing card: its enhancement, rank and suit, and seal), its
// edition as a CSS effect over the card's shape, and the stake sticker of the
// win it came from. A booster is drawn as the game's pack it looks like.
import { Link } from 'react-router';
import type { CSSProperties, ReactNode } from 'react';
import type { Booster, Drawable, Item, SpriteCell } from '@/shared/api';
import { GAME_URL } from '@/shared/config';
import { Icon, useTilt } from '@/shared/ui';
import { t } from '@/shared/i18n';
import { booster_name, edition_name, item_label, item_name, odds_label, rarity_name, upgrades_label } from '../lib/text';

const TEXTURES = `${GAME_URL}/resources/textures/2x`;
type Atlas = { file: string; px: number; py: number; cols: number; rows: number };
const CARD_SHEET = (file: string, cols: number, rows: number): Atlas => ({ file, px: 71, py: 95, cols, rows });
// the sheets at 1x: cell size and how many cells across and down
const ATLASES: Record<string, Atlas> = {
  Joker: CARD_SHEET('Jokers.png', 10, 16),
  Tarot: CARD_SHEET('Tarots.png', 10, 6),
  Planet: CARD_SHEET('Tarots.png', 10, 6),
  Spectral: CARD_SHEET('Tarots.png', 10, 6),
  centers: CARD_SHEET('Enhancers.png', 7, 5),
  cards_1: CARD_SHEET('8BitDeck.png', 13, 4),
  Booster: CARD_SHEET('boosters.png', 4, 9),
};
const STICKERS = CARD_SHEET('stickers.png', 5, 3);
// the game's stake stickers (G.shared_stickers), by stake
const STAKE_STICKERS: Record<number, [number, number]> = {
  1: [1, 0], 2: [2, 0], 3: [3, 0], 4: [0, 1], 5: [4, 0], 6: [1, 1], 7: [2, 1], 8: [3, 1],
};
// the game's packs (boosters.png), by key
const PACKS: Record<string, [number, number]> = {
  p_arcana_normal_1: [0, 0], p_arcana_jumbo_1: [0, 2], p_arcana_mega_1: [2, 2],
  p_celestial_normal_1: [0, 1], p_celestial_jumbo_1: [0, 3], p_celestial_mega_1: [2, 3],
  p_spectral_normal_1: [0, 4], p_spectral_jumbo_1: [2, 4], p_spectral_mega_1: [3, 4],
  p_standard_normal_1: [0, 6], p_standard_jumbo_1: [0, 7], p_standard_mega_1: [2, 7],
  p_buffoon_normal_1: [0, 8], p_buffoon_jumbo_1: [2, 8], p_buffoon_mega_1: [3, 8],
};

/**
 * The CSS of one cell of a sheet, `scale` pixels per 1x pixel: its shape (a
 * mask) and, unless `picture` is false, its picture. An edition's layer takes
 * only the shape: its own light (the stylesheet's background and its
 * animation) must not be the sprite sheet, which the animation would scroll
 * across the card.
 */
function cell(atlas: Atlas, x: number, y: number, scale: number, picture = true): CSSProperties {
  const url = `url("${TEXTURES}/${atlas.file}")`;
  const size = `${atlas.cols * atlas.px * scale}px ${atlas.rows * atlas.py * scale}px`;
  const pos = `${-x * atlas.px * scale}px ${-y * atlas.py * scale}px`;
  const shape: CSSProperties = {
    width: atlas.px * scale, height: atlas.py * scale,
    maskImage: url, maskSize: size, maskPosition: pos, WebkitMaskImage: url, WebkitMaskSize: size, WebkitMaskPosition: pos,
  };
  return picture ? { ...shape, backgroundImage: url, backgroundSize: size, backgroundPosition: pos } : shape;
}

function Layer({ sprite, scale, className }: { sprite: SpriteCell | null | undefined; scale: number; className: string }) {
  const atlas = sprite ? ATLASES[sprite.atlas] : undefined;
  if (!sprite || !atlas) return null;
  return <div className={`item-art__layer ${className}`} style={cell(atlas, sprite.pos.x, sprite.pos.y, scale)} />;
}

/** the card's picture: `scale` 1 is the game's 1x size (71 x 95) */
export function ItemArt({ item, scale = 1.5 }: { item: Drawable; scale?: number }) {
  const sprite = item.sprite;
  const atlas = sprite ? ATLASES[sprite.atlas] : undefined;
  if (!atlas || !sprite) {
    return <div className="item-art item-art--missing" style={{ width: 71 * scale, height: 95 * scale }}>{item_name(item)}</div>;
  }
  const { x, y } = sprite.pos;
  const soul = sprite.soul_pos;
  const sticker = item.stake && item.kind === 'joker' ? STAKE_STICKERS[item.stake] : undefined;
  return (
    <div className={`item-art item-art--${item.edition} item-art--${item.kind}`} style={{ width: atlas.px * scale, height: atlas.py * scale }}>
      <div className="item-art__layer item-art__base" style={cell(atlas, x, y, scale)} />
      <Layer sprite={sprite.front} scale={scale} className="item-art__front" />
      {item.edition !== 'base' ? <div className="item-art__layer item-art__edition" style={cell(atlas, x, y, scale, false)} /> : null}
      <Layer sprite={sprite.seal} scale={scale} className="item-art__seal" />
      {soul ? <div className="item-art__layer item-art__soul" style={cell(atlas, soul.x, soul.y, scale)} /> : null}
      <Layer sprite={sprite.overlay} scale={scale} className="item-art__soul" />
      {sticker ? <div className="item-art__layer item-art__sticker" style={cell(STICKERS, sticker[0], sticker[1], scale)} /> : null}
    </div>
  );
}

/** a booster: the game's pack it looks like, lit by its tier (standard, boosted: a sheen, premium: gold and a rainbow) */
export function BoosterArt({ booster, scale = 1.6 }: { booster: Pick<Booster, 'art' | 'tier' | 'kind'>; scale?: number }) {
  const pos = PACKS[booster.art];
  const atlas = ATLASES.Booster;
  return (
    <div className={`booster-art booster-art--${booster.tier} booster-art--${booster.kind}`} style={{ width: atlas.px * scale, height: atlas.py * scale }}>
      {pos ? <div className="item-art__layer booster-art__pack" style={cell(atlas, pos[0], pos[1], scale)} /> : null}
      {pos && booster.tier !== 'standard' ? <div className="item-art__layer booster-art__light" style={cell(atlas, pos[0], pos[1], scale, false)} /> : null}
      <span className="visually-hidden">{booster_name(booster)}</span>
    </div>
  );
}

/** an item with its name, rarity, edition, upgrades, number and odds; `to`: where clicking it goes. It tilts toward
 *  the pointer; `index` staggers its entrance in a grid. */
export function ItemCard({ item, to, selected, onSelect, index = 0, children }: {
  item: Item; to?: string; selected?: boolean; onSelect?: () => void; index?: number; children?: ReactNode;
}) {
  const link = useTilt<HTMLAnchorElement>(12);
  const button = useTilt<HTMLButtonElement>(12);
  const plain = useTilt<HTMLDivElement>(12);
  const upgrades = upgrades_label(item);
  const body = (
    <>
      {selected ? (
        <span className="item-card__check" aria-hidden>
          <Icon name="check" />
        </span>
      ) : null}
      {!item.tradable ? (
        <span className="item-card__hold" title={t('Can’t change hands now')}>
          <Icon name="clock" />
        </span>
      ) : null}
      <span className="item-card__stage">
        <ItemArt item={item} />
      </span>
      <span className="item-card__name">{item_name(item)}</span>
      {upgrades ? <span className="item-card__upgrades">{upgrades}</span> : null}
      <span className="item-card__meta">
        <span className={`rarity rarity--${item.rarity}`}>{rarity_name(item.rarity)}</span>
        {item.edition !== 'base' ? <span className={`edition edition--${item.edition}`}>{edition_name(item.edition)}</span> : null}
      </span>
      <span className="item-card__numbers">
        {t('#{serial} of {minted}', { serial: item.serial, minted: item.minted })} · {odds_label(item.odds)}
      </span>
    </>
  );
  const cls = [
    'item-card', `item-card--r${item.rarity}`, `item-card--${item.edition}`, selected && 'item-card--selected', !item.tradable && 'item-card--held',
  ].filter(Boolean).join(' ');
  return (
    <li className={cls} style={{ '--i': Math.min(index, 24) } as CSSProperties}>
      {onSelect ? (
        <button ref={button} type="button" className="item-card__body" aria-pressed={!!selected} onClick={onSelect} title={item_label(item)}>
          {body}
        </button>
      ) : to ? (
        <Link ref={link} className="item-card__body" to={to} title={item_label(item)} viewTransition>
          {body}
        </Link>
      ) : (
        <div ref={plain} className="item-card__body" title={item_label(item)}>
          {body}
        </div>
      )}
      {children}
    </li>
  );
}
