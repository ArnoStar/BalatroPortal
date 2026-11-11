// The pot as a bar: each entry's part (its value, in order), and once drawn
// the roll that won. `animate`: the marker sweeps to the roll.
import { useEffect, useState } from 'react';
import type { CasinoGame } from '@/shared/api';
import { player_colours, value_label } from '../lib/text';

export function PotBar({ game, animate = false }: { game: CasinoGame; animate?: boolean }) {
  const colours = player_colours(game);
  const target = game.roll !== null && game.value ? (100 * (game.roll + 0.5)) / game.value : null;
  const [at, setAt] = useState(animate ? 0 : target);
  useEffect(() => {
    if (!animate) {
      setAt(target);
      return;
    }
    setAt(0);
    const frame = requestAnimationFrame(() => requestAnimationFrame(() => setAt(target)));
    return () => cancelAnimationFrame(frame);
  }, [animate, target, game.id]);
  return (
    <div className="pot-bar" role="img" aria-label={pot_label(game)}>
      <div className="pot-bar__track">
        {game.entries.map((e, i) => (
          <span
            key={i}
            className="pot-bar__part"
            style={{ width: `${(100 * e.value) / (game.value || 1)}%`, background: colours[e.player] }}
            title={`${e.player_name ?? 'A player'}: ${value_label(e.value)} (${e.chance}%)`}
          />
        ))}
      </div>
      {at !== null ? <span className={`pot-bar__roll${animate ? ' pot-bar__roll--sweep' : ''}`} style={{ left: `${at}%` }} aria-hidden /> : null}
    </div>
  );
}

function pot_label(game: CasinoGame): string {
  const parts = game.entries.map((e) => `${e.player_name ?? 'a player'} ${e.chance}%`).join(', ');
  return game.roll !== null ? `${parts}; the roll ${game.roll} of ${game.value} went to ${game.winner_name ?? 'a player'}` : parts;
}
