// A coinflip's coin: Chips on one face, Mult on the other. `flip`: it spins and
// lands on the winner's side (at once with reduced motion).
import type { CasinoGame } from '@/shared/api';
import { SIDE_NAMES, landed_side } from '../lib/text';

export function Coin({ game, flip = false }: { game: CasinoGame; flip?: boolean }) {
  const side = landed_side(game) ?? game.side ?? 'chips';
  const cls = ['coin', `coin--${side}`, flip && 'coin--flip'].filter(Boolean).join(' ');
  return (
    <div className="coin-stage" aria-label={landed_side(game) ? `The coin landed on ${SIDE_NAMES[side]}` : undefined}>
      <div className={cls} key={flip ? `${game.id}-flip` : game.id}>
        <span className="coin__face coin__face--chips">{SIDE_NAMES.chips}</span>
        <span className="coin__face coin__face--mult">{SIDE_NAMES.mult}</span>
      </div>
    </div>
  );
}
