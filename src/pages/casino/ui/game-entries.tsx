// A game's entries: who put what in, worth how much, for what chance.
import { Link } from 'react-router';
import { ItemArt, item_label } from '@/entities/item';
import type { CasinoGame } from '@/shared/api';
import { SIDE_NAMES, player_colours, value_label } from '../lib/text';

export function GameEntries({ game, me }: { game: CasinoGame; me?: string }) {
  const colours = player_colours(game);
  return (
    <ul className="entries">
      {game.entries.map((e, i) => {
        const side = game.mode === 'coinflip' && game.side ? (i === 0 ? game.side : game.side === 'chips' ? 'mult' : 'chips') : null;
        const won = game.winner === e.player;
        return (
          <li key={i} className={`entry${won ? ' entry--won' : ''}`} style={{ borderLeftColor: colours[e.player] }}>
            <div className="entry__who">
              <strong>
                {e.player === me ? 'You' : <Link to={`/players/${encodeURIComponent(e.player)}`}>{e.player_name ?? 'A player'}</Link>}
              </strong>
              {side ? <span className={`side side--${side}`}>{SIDE_NAMES[side]}</span> : null}
              {won ? <span className="tag tag--win">Won</span> : null}
            </div>
            <div className="entry__numbers">
              <span>Worth {value_label(e.value)}</span>
              <span className="entry__chance">{e.chance}%</span>
            </div>
            <ul className="entry__items">
              {e.items.map((it) => (
                <li key={it.id}>
                  <Link to={`/item/${it.id}`} title={item_label(it)}>
                    <ItemArt item={it} scale={0.8} />
                  </Link>
                </li>
              ))}
            </ul>
          </li>
        );
      })}
    </ul>
  );
}
