import type { CSSProperties } from 'react';
import { useSession } from '@/entities/session';
import { GAME_URL } from '@/shared/config';
import { AnchorButton, Avatar, CardFan, Icon, LinkButton, useTilt } from '@/shared/ui';

const WORD = [...'BALATRO'];

/** The front door: the name, what it is, the way in, and a hand of cards that leans toward the pointer. */
export function Hero({ open }: { open: boolean }) {
  const { status, account } = useSession();
  const ref = useTilt<HTMLElement>(12);
  const signed_in = status === 'signed-in';
  const play_next = new URLSearchParams({ next: `${GAME_URL}/` });
  return (
    <section className={`hero${signed_in ? ' hero--compact' : ''}`} ref={ref} aria-labelledby="hero-title">
      <div className="hero__text">
        {signed_in && account ? (
          <p className="hero__badge">
            <Avatar name={account.display_name} size="sm" />
            Welcome back, <strong>{account.display_name}</strong>
          </p>
        ) : (
          <p className="hero__badge">
            <span className="hero__dot" aria-hidden />
            The poker roguelike, in your browser
          </p>
        )}
        <h1 className="wordmark" id="hero-title" aria-label="Balatro">
          {WORD.map((letter, i) => (
            <span key={i} style={{ '--i': i } as CSSProperties} aria-hidden>
              {letter}
            </span>
          ))}
        </h1>
        <p className="hero__lead">
          The poker roguelike, in your browser, with the original game's rules: <strong>same seed, same run.</strong>
        </p>
        <div className="hero__actions">
          {signed_in || open ? (
            <>
              <AnchorButton size="lg" className="btn--play" href={`${GAME_URL}/`} icon={<Icon name="play" />}>
                Play now
              </AnchorButton>
              <LinkButton size="lg" tone="grey" to={signed_in ? '/stats' : '/leaderboards'} icon={<Icon name={signed_in ? 'chart' : 'trophy'} />} viewTransition>
                {signed_in ? 'Your stats' : 'Leaderboards'}
              </LinkButton>
            </>
          ) : (
            <>
              <LinkButton size="lg" className="btn--play" to={`/login?${play_next}`} icon={<Icon name="play" />} viewTransition>
                Sign in to play
              </LinkButton>
              <LinkButton size="lg" tone="grey" to={`/register?${play_next}`} icon={<Icon name="user-plus" />} viewTransition>
                Create an account
              </LinkButton>
            </>
          )}
        </div>
        <ul className="hero__proof">
          <li>
            <Icon name="target" /> Seed-exact rules
          </li>
          <li>
            <Icon name="eye" /> Watch any run again
          </li>
          <li>
            <Icon name="cards" /> Items to find and trade
          </li>
        </ul>
      </div>
      <div className="hero__art">
        <CardFan size={signed_in ? 'md' : 'lg'} />
      </div>
    </section>
  );
}
