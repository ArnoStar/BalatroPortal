// A coinflip's coin, drawn as a poker chip: Chips (blue) on one face, Mult
// (red) on the other, with an edge. `flip`: it is tossed, spins, and lands on
// the winner's side (at once with reduced motion). `size`: small in lists.
import type { CasinoGame, Side } from '@/shared/api';
import { SIDE_NAMES, landed_side } from '../lib/text';

const EDGE = [-3, -2, -1, 0, 1, 2, 3];

export function Coin({ game, side: shown, flip = false, size = 'lg' }: { game?: CasinoGame; side?: Side; flip?: boolean; size?: 'sm' | 'lg' }) {
  const landed = game ? landed_side(game) : null;
  const side = shown ?? landed ?? game?.side ?? 'chips';
  const cls = ['coin', `coin--${size}`, `coin--${side}`, flip && 'coin--flip'].filter(Boolean).join(' ');
  return (
    <div className={cls} role="img" aria-label={landed ? `The coin landed on ${SIDE_NAMES[side]}` : `${SIDE_NAMES[side]} side`}>
      <div className="coin__toss" key={flip && game ? `${game.id}-flip` : side}>
        <div className="coin__body">
          {EDGE.map((z) => (
            <span key={z} className="coin__edge" style={{ transform: `translateZ(${z}px)` }} />
          ))}
          <span className="coin__face coin__face--chips">
            <b>{SIDE_NAMES.chips}</b>
          </span>
          <span className="coin__face coin__face--mult">
            <b>{SIDE_NAMES.mult}</b>
          </span>
        </div>
      </div>
      <span className="coin__shadow" />
    </div>
  );
}
