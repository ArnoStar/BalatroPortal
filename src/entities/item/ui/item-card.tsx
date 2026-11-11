// An item drawn with the game's own sprites (served by the game at
// /play/resources/textures), its edition as a CSS effect over the card's
// shape, and the stake sticker of the win it came from.
import { Link } from 'react-router';
import type { CSSProperties, ReactNode } from 'react';
import type { Item } from '@/shared/api';
import { GAME_URL } from '@/shared/config';
import { Icon, useTilt } from '@/shared/ui';
import { EDITION_NAMES, RARITY_NAMES, item_label, odds_label } from '../lib/text';

const TEXTURES = `${GAME_URL}/resources/textures/2x`;
// the sheets at 1x: cell size and how many cells across and down
const ATLASES: Record<string, { file: string; px: number; py: number; cols: number; rows: number }> = {
  Joker: { file: 'Jokers.png', px: 71, py: 95, cols: 10, rows: 16 },
  tags: { file: 'tags.png', px: 34, py: 34, cols: 6, rows: 5 },
};
const STICKERS = { file: 'stickers.png', px: 71, py: 95, cols: 5, rows: 3 };
// the game's stake stickers (G.shared_stickers), by stake
const STAKE_STICKERS: Record<number, [number, number]> = {
  1: [1, 0], 2: [2, 0], 3: [3, 0], 4: [0, 1], 5: [4, 0], 6: [1, 1], 7: [2, 1], 8: [3, 1],
};

type Atlas = typeof STICKERS;

/** the CSS of one cell of a sheet, `scale` pixels per 1x pixel (as background and as mask) */
function cell(atlas: Atlas, x: number, y: number, scale: number): CSSProperties {
  const url = `url("${TEXTURES}/${atlas.file}")`;
  const size = `${atlas.cols * atlas.px * scale}px ${atlas.rows * atlas.py * scale}px`;
  const pos = `${-x * atlas.px * scale}px ${-y * atlas.py * scale}px`;
  return {
    width: atlas.px * scale, height: atlas.py * scale,
    backgroundImage: url, backgroundSize: size, backgroundPosition: pos,
    maskImage: url, maskSize: size, maskPosition: pos, WebkitMaskImage: url, WebkitMaskSize: size, WebkitMaskPosition: pos,
  };
}

/** the item's picture: `scale` 1 is the game's 1x size (71 x 95 for a joker) */
export function ItemArt({ item, scale = 1.5 }: { item: Item; scale?: number }) {
  const atlas = item.sprite ? ATLASES[item.sprite.atlas] : undefined;
  if (!atlas || !item.sprite) {
    return <div className="item-art item-art--missing" style={{ width: 71 * scale, height: 95 * scale }}>{item.name}</div>;
  }
  const { x, y } = item.sprite.pos;
  const soul = item.sprite.soul_pos;
  const sticker = item.stake && item.kind === 'joker' ? STAKE_STICKERS[item.stake] : undefined;
  return (
    <div className={`item-art item-art--${item.edition} item-art--${item.kind}`} style={{ width: atlas.px * scale, height: atlas.py * scale }}>
      <div className="item-art__layer item-art__base" style={cell(atlas, x, y, scale)} />
      {soul ? <div className="item-art__layer item-art__soul" style={cell(atlas, soul.x, soul.y, scale)} /> : null}
      {item.edition !== 'base' ? <div className="item-art__layer item-art__edition" style={cell(atlas, x, y, scale)} /> : null}
      {sticker ? <div className="item-art__layer item-art__sticker" style={cell(STICKERS, sticker[0], sticker[1], scale)} /> : null}
    </div>
  );
}

/** an item with its name, rarity, edition, number and odds; `to`: where clicking it goes. It tilts toward the
 *  pointer; `index` staggers its entrance in a grid. */
export function ItemCard({ item, to, selected, onSelect, index = 0, children }: {
  item: Item; to?: string; selected?: boolean; onSelect?: () => void; index?: number; children?: ReactNode;
}) {
  const link = useTilt<HTMLAnchorElement>(12);
  const button = useTilt<HTMLButtonElement>(12);
  const plain = useTilt<HTMLDivElement>(12);
  const body = (
    <>
      {selected ? (
        <span className="item-card__check" aria-hidden>
          <Icon name="check" />
        </span>
      ) : null}
      <span className="item-card__stage">
        <ItemArt item={item} />
      </span>
      <span className="item-card__name">{item.name}</span>
      <span className="item-card__meta">
        <span className={`rarity rarity--${item.rarity}`}>{RARITY_NAMES[item.rarity]}</span>
        {item.edition !== 'base' ? <span className={`edition edition--${item.edition}`}>{EDITION_NAMES[item.edition]}</span> : null}
      </span>
      <span className="item-card__numbers">
        #{item.serial} of {item.minted} · {odds_label(item.odds)}
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
