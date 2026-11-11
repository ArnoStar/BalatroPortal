import type { CSSProperties } from 'react';
import { game_api } from '@/shared/api';
import { GAME_URL } from '@/shared/config';
import { format_number, use_async } from '@/shared/lib';
import { Alert, AnchorButton, CountUp, Icon, LinkButton, useTilt, type Accent, type IconName } from '@/shared/ui';

const FEATURES: { icon: IconName; accent: Accent; title: string; text: string }[] = [
  {
    icon: 'target',
    accent: 'blue',
    title: 'The real rules',
    text: "Every shuffle, shop and boss blind follows the original game's rules, so a seed always plays the same run.",
  },
  {
    icon: 'trophy',
    accent: 'gold',
    title: 'Leaderboards',
    text: 'Best hand, highest ante, most money, bosses in a row and wins, by deck and by stake.',
  },
  {
    icon: 'cards',
    accent: 'violet',
    title: 'Items to collect',
    text: "Find the game's jokers and tags, some foil, holographic, polychrome or negative, and trade them.",
  },
  {
    icon: 'eye',
    accent: 'green',
    title: 'Watch any run',
    text: "Play your runs back move by move, and other players' finished ones from their profiles.",
  },
];

function Feature({ icon, accent, title, text, i }: (typeof FEATURES)[number] & { i: number }) {
  const ref = useTilt<HTMLLIElement>(8);
  return (
    <li ref={ref} className={`feature accent--${accent}`} style={{ '--i': i } as CSSProperties}>
      <span className="feature__icon" aria-hidden>
        <Icon name={icon} />
      </span>
      <h3>{title}</h3>
      <p>{text}</p>
    </li>
  );
}

/** For visitors: what the site is, everyone's numbers (when the API shares them), and the way in. */
export function Landing({ open }: { open: boolean }) {
  // everyone's numbers need a signed-in player, unless the API runs without sign-in
  const everyone = use_async(() => (open ? game_api.global_stats() : Promise.resolve(null)), [open]);
  const g = everyone.data;
  const play_next = new URLSearchParams({ next: `${GAME_URL}/` });
  return (
    <>
      {open ? <Alert tone="info">This server runs without accounts: everyone plays as the same player.</Alert> : null}
      <section aria-labelledby="features-title">
        <div className="section-head">
          <div>
            <p className="eyebrow">
              <Icon name="sparkles" /> What's here
            </p>
            <h2 className="section-title" id="features-title">
              A whole run, in a browser tab
            </h2>
          </div>
        </div>
        <ul className="features">
          {FEATURES.map((f, i) => (
            <Feature key={f.title} {...f} i={i} />
          ))}
        </ul>
      </section>
      {g ? (
        <section aria-labelledby="numbers-title">
          <div className="section-head">
            <div>
              <p className="eyebrow">
                <Icon name="pulse" /> Everyone's runs
              </p>
              <h2 className="section-title" id="numbers-title">
                The table so far
              </h2>
            </div>
            <LinkButton to="/leaderboards" tone="grey" icon={<Icon name="trophy" />} viewTransition>
              Leaderboards
            </LinkButton>
          </div>
          <dl className="numbers">
            <div>
              <dt>Players</dt>
              <dd>
                <CountUp value={g.players} />
              </dd>
            </div>
            <div>
              <dt>Runs</dt>
              <dd>
                <CountUp value={g.runs} />
              </dd>
            </div>
            <div>
              <dt>Hands played</dt>
              <dd>
                <CountUp value={g.hands_played} />
              </dd>
            </div>
            <div>
              <dt>Best hand</dt>
              <dd>{typeof g.best_hand === 'number' ? <CountUp value={g.best_hand} /> : format_number(g.best_hand)}</dd>
            </div>
            <div>
              <dt>Highest ante</dt>
              <dd>
                <CountUp value={g.highest_ante} />
              </dd>
            </div>
          </dl>
        </section>
      ) : null}
      <section className="cta-band" aria-labelledby="cta-title">
        <div className="cta-band__suits" aria-hidden>
          <Icon name="spade" />
          <Icon name="heart" />
          <Icon name="club" />
          <Icon name="diamond" />
        </div>
        <div>
          <h2 id="cta-title">Your next run is one click away.</h2>
          <p>Free, in the browser, and your runs, stats and items stay with your account.</p>
        </div>
        <div className="row">
          {open ? (
            <AnchorButton size="lg" className="btn--play" href={`${GAME_URL}/`} icon={<Icon name="play" />}>
              Play now
            </AnchorButton>
          ) : (
            <>
              <LinkButton size="lg" className="btn--play" to={`/register?${play_next}`} icon={<Icon name="user-plus" />} viewTransition>
                Create an account
              </LinkButton>
              <LinkButton size="lg" tone="grey" to={`/login?${play_next}`} viewTransition>
                Sign in
              </LinkButton>
            </>
          )}
        </div>
      </section>
    </>
  );
}
