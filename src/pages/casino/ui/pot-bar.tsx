// The pot as a bar: each entry's part (its value, in order) and, once drawn,
// the roll that won. The reel: the same pot laid end to end, sliding under a
// marker and stopping where the roll fell.
import { useEffect, useState, type CSSProperties } from 'react';
import type { CasinoGame } from '@/shared/api';
import { Avatar } from '@/shared/ui';
import { player_colours, value_label } from '../lib/text';

function pot_label(game: CasinoGame): string {
  const parts = game.entries.map((e) => `${e.player_name ?? 'a player'} ${e.chance}%`).join(', ');
  return game.roll !== null ? `${parts}; the roll ${game.roll} of ${game.value} went to ${game.winner_name ?? 'a player'}` : parts;
}

/** the share of the pot where the roll fell (null: not drawn) */
const roll_at = (game: CasinoGame) => (game.roll !== null && game.value ? (game.roll + 0.5) / game.value : null);

export function PotBar({ game }: { game: CasinoGame }) {
  const colours = player_colours(game);
  const at = roll_at(game);
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
      {at !== null ? <span className="pot-bar__roll" style={{ left: `${at * 100}%` }} aria-hidden /> : null}
    </div>
  );
}

/** how many times the pot is laid end to end; the reel stops in the last but one */
const LAPS = 7;

export function Reel({ game }: { game: CasinoGame }) {
  const colours = player_colours(game);
  const at = roll_at(game) ?? 0.5;
  const [go, setGo] = useState(false);
  useEffect(() => {
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => setGo(true));
    });
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
    };
  }, [game.id]);
  return (
    <div className={`reel${go ? ' reel--go' : ''}`} style={{ '--from': 0.5, '--to': LAPS - 2 + at } as CSSProperties} role="img" aria-label={pot_label(game)}>
      <div className="reel__strip">
        {Array.from({ length: LAPS }, (_, lap) => (
          <div key={lap} className="reel__pot">
            {game.entries.map((e, i) => {
              const share = e.value / (game.value || 1);
              return (
                <span key={i} className="reel__part" style={{ width: `${share * 100}%`, background: colours[e.player] }}>
                  {share > 0.07 ? <Avatar name={e.player_name} size="sm" /> : null}
                </span>
              );
            })}
          </div>
        ))}
      </div>
      <span className="reel__marker" aria-hidden />
    </div>
  );
}
