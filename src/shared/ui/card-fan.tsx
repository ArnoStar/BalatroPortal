// A hand of five cards fanned out, floating: the portal's own card design (not
// the game's art). Decorative. It leans with the --rx / --ry of a parent that
// uses useTilt, and its glare follows that parent's --px / --py.
import type { CSSProperties } from 'react';
import { Icon } from './icons';

type Suit = 'spade' | 'heart' | 'diamond' | 'club';
type Card = { rank: string; suit: Suit } | { wild: true };

const HAND: Card[] = [
  { rank: 'K', suit: 'heart' },
  { rank: 'Q', suit: 'diamond' },
  { wild: true },
  { rank: 'J', suit: 'club' },
  { rank: 'A', suit: 'spade' },
];

function Face({ rank, suit }: { rank: string; suit: Suit }) {
  const court = rank === 'K' || rank === 'Q' || rank === 'J';
  return (
    <>
      <span className="play-card__corner">
        <b>{rank}</b>
        <Icon name={suit} />
      </span>
      {court ? (
        <span className="play-card__court">
          <Icon name={suit} />
          <b>{rank}</b>
          <Icon name={suit} />
        </span>
      ) : (
        <span className="play-card__pip">
          <Icon name={suit} />
        </span>
      )}
      <span className="play-card__corner play-card__corner--end">
        <b>{rank}</b>
        <Icon name={suit} />
      </span>
    </>
  );
}

export function CardFan({ size = 'lg' }: { size?: 'md' | 'lg' }) {
  const middle = (HAND.length - 1) / 2;
  return (
    <div className={`card-fan card-fan--${size}`} aria-hidden>
      <div className="card-fan__glow" />
      <div className="card-fan__hand">
        {HAND.map((card, i) => {
          const style = {
            '--angle': `${(i - middle) * 15.5}deg`,
            '--drop': `${Math.abs(i - middle) * 4.5}%`,
            '--z': `${(middle - Math.abs(i - middle)) * 14}px`,
            '--delay': `${i * -1.3}s`,
            '--deal': `${120 + i * 90}ms`,
          } as CSSProperties;
          return 'wild' in card ? (
            <div key={i} className="play-card play-card--wild" style={style}>
              <span className="play-card__holo" />
              <span className="play-card__wild">
                <Icon name="sparkle" />
              </span>
              <span className="play-card__corner"><Icon name="star" /></span>
              <span className="play-card__corner play-card__corner--end"><Icon name="star" /></span>
              <span className="play-card__glare" />
            </div>
          ) : (
            <div key={i} className={`play-card play-card--${card.suit}`} style={style}>
              <Face rank={card.rank} suit={card.suit} />
              <span className="play-card__glare" />
            </div>
          );
        })}
      </div>
      <div className="card-fan__shadow" />
    </div>
  );
}
