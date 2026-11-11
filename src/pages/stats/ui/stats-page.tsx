import { DeckGlyph, deck_name, stake_name, useCatalogNames } from '@/entities/catalog';
import { describe, game_api, type PlayerStats } from '@/shared/api';
import { GAME_URL } from '@/shared/config';
import { format_number, format_percent, use_async } from '@/shared/lib';
import {
  Alert, AnchorButton, BarList, ColumnChart, CountUp, EmptyState, Icon, LinkButton, Meter, PageHeader, Panel, Ring, Spinner, StatTile, plural,
} from '@/shared/ui';

const day = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });

/** The game's Profile > Stats, from the player's runs on this site. */
export function StatsPage() {
  const { data, error, loading } = use_async(() => game_api.player_stats(), []);
  return (
    <div className="stack">
      <PageHeader
        eyebrow="You"
        icon="chart"
        title="Your stats"
        lead="Your runs on this site in numbers, like the game's Profile › Stats."
        actions={
          <LinkButton to="/players/me" tone="grey" icon={<Icon name="user" />} viewTransition>
            Your profile
          </LinkButton>
        }
      />
      {loading && !data ? <Spinner /> : null}
      {error ? <Alert>{describe(error)}</Alert> : null}
      {data ? data.runs.counted ? <Stats s={data} /> : <NoRuns total={data.runs.total} /> : null}
    </div>
  );
}

function NoRuns({ total }: { total: number }) {
  return (
    <Panel>
      <EmptyState
        icon="chart"
        title={total ? 'None of your runs count yet' : 'No run yet'}
        action={
          <AnchorButton href={`${GAME_URL}/`} icon={<Icon name="play" />}>
            Play a run
          </AnchorButton>
        }
      >
        {total ? 'As in the game, runs with a chosen seed and challenges stay out of the stats.' : 'Your stats appear after your first run.'}
      </EmptyState>
    </Panel>
  );
}

function Stats({ s }: { s: PlayerStats }) {
  const name = useCatalogNames();
  const { runs, high_scores: h, career: c } = s;
  const finished = runs.won + runs.lost;
  return (
    <>
      <section className="stats-hero" aria-label="Your best">
        <div className="stats-hero__main">
          <p className="eyebrow">
            <Icon name="zap" /> Best hand
          </p>
          <p className="hero-figure">{typeof h.best_hand === 'number' ? <CountUp value={h.best_hand} /> : format_number(h.best_hand)}</p>
          <p className="stats-hero__sub">
            {h.most_played_hand ? (
              <>
                Most played hand: <strong>{h.most_played_hand.key}</strong>, {plural(h.most_played_hand.count, 'time')}
              </>
            ) : (
              'No hand played yet'
            )}
          </p>
        </div>
        <div className="stats-hero__ring">
          <Ring value={runs.won} max={finished} label={`Won ${runs.won} of ${finished} finished runs`} />
          <div>
            <strong>{format_percent(runs.won, finished)}</strong>
            <span>win rate</span>
            <small>
              {runs.won} of {plural(finished, 'finished run')}
            </small>
          </div>
        </div>
      </section>

      <section className="tiles" aria-label="Runs">
        <StatTile
          icon="layers"
          accent="violet"
          label="Runs"
          value={<CountUp value={runs.counted} />}
          hint={runs.total > runs.counted ? `${plural(runs.total - runs.counted, 'other run')} not counted` : undefined}
        />
        <StatTile icon="check-circle" accent="green" label="Won" value={<CountUp value={runs.won} />} />
        <StatTile icon="x-circle" accent="red" label="Lost" value={<CountUp value={runs.lost} />} />
        <StatTile icon="pulse" accent="blue" label="In progress" value={<CountUp value={runs.in_progress} />} />
      </section>

      <Panel title="High scores" icon="trophy">
        <div className="tiles">
          <StatTile icon="target" accent="blue" label="Highest ante" value={<CountUp value={h.highest_ante} />} />
          <StatTile icon="layers" accent="violet" label="Highest round" value={<CountUp value={h.highest_round} />} />
          <StatTile icon="coins" accent="gold" label="Most money" value={<span className="money">${format_number(h.most_money)}</span>} />
          <StatTile icon="flame" accent="red" label="Most bosses in a row" value={<CountUp value={h.boss_streak} />} />
          <StatTile icon="zap" accent="orange" label="Best win streak" value={<CountUp value={h.best_win_streak} />} hint={`Current: ${h.current_win_streak}`} />
        </div>
      </Panel>

      <Panel title="Last 30 days" icon="calendar">
        <ColumnChart
          unit="runs"
          caption="Runs started per day (UTC)"
          columns={s.activity.map((d) => ({
            key: d.date,
            label: day.format(new Date(`${d.date}T00:00:00Z`)),
            value: d.runs,
            detail: d.runs ? `${d.wins} won` : undefined,
          }))}
        />
      </Panel>

      <div className="grid-2">
        <Panel title="Poker hands played" icon="cards">
          <BarList bars={s.hands.map((u) => ({ key: u.key, label: u.key, value: u.count }))} />
        </Panel>
        <Panel title="Career" icon="history">
          <dl className="facts">
            <Fact label="Hands played" value={c.hands_played} />
            <Fact label="Cards played" value={c.cards_played} />
            <Fact label="Face cards played" value={c.face_cards_played} />
            <Fact label="Cards discarded" value={c.cards_discarded} />
            <Fact label="Rounds" value={c.rounds} />
            <Fact label="Money earned" value={`$${format_number(c.dollars_earned)}`} />
            <Fact label="Spent in shops" value={`$${format_number(c.shop_dollars_spent)}`} />
            <Fact label="Shop rerolls" value={c.shop_rerolls} />
            <Fact label="Jokers sold" value={c.jokers_sold} />
            <Fact label="Cards sold" value={c.cards_sold} />
            <Fact label="Tarots bought" value={c.tarots_bought} />
            <Fact label="Planets bought" value={c.planets_bought} />
            <Fact label="Playing cards bought" value={c.playing_cards_bought} />
            <Fact label="Vouchers bought" value={c.vouchers_bought} />
            <Fact label="Arcana packs finished" value={c.tarot_readings_used} />
            <Fact label="Celestial packs finished" value={c.planetariums_used} />
          </dl>
        </Panel>
      </div>

      <Panel title="Decks" icon="layers">
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Deck</th>
                <th scope="col" className="num">Runs</th>
                <th scope="col" className="num">Won</th>
                <th scope="col" className="num">Lost</th>
                <th scope="col">Win rate</th>
                <th scope="col">Best stake won</th>
              </tr>
            </thead>
            <tbody>
              {s.decks.map((d) => (
                <tr key={d.deck}>
                  <th scope="row">
                    <span className="deck-name">
                      <DeckGlyph deck={d.deck} size="sm" />
                      {deck_name(d.deck)}
                    </span>
                  </th>
                  <td className="num">{d.runs}</td>
                  <td className="num">{d.wins}</td>
                  <td className="num">{d.losses}</td>
                  <td>
                    <span className="rate">
                      <Meter value={d.wins} max={d.wins + d.losses} label={`${deck_name(d.deck)}: won ${d.wins} of ${d.wins + d.losses}`} />
                      <span className="rate__value">{format_percent(d.wins, d.wins + d.losses)}</span>
                    </span>
                  </td>
                  <td>{d.best_stake_won ? <span className={`stake stake--${d.best_stake_won}`}>{stake_name(d.best_stake_won)}</span> : <span className="muted">–</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="grid-2">
        <Panel title="Jokers" icon="sparkles">
          <BarList
            empty="No joker kept through a round yet."
            bars={s.jokers.slice(0, 15).map((j) => ({
              key: j.key,
              label: name(j.key),
              value: j.rounds,
              text: plural(j.rounds, 'round'),
              detail: j.wins ? `won with it ${j.wins}×${j.best_stake_won ? `, up to ${stake_name(j.best_stake_won)}` : ''}` : undefined,
            }))}
          />
        </Panel>
        <div className="stack">
          <Panel title="Consumables used" icon="wand">
            <BarList empty="None yet." bars={s.consumables.slice(0, 10).map((u) => ({ key: u.key, label: name(u.key), value: u.count }))} />
          </Panel>
          <Panel title="Vouchers redeemed" icon="note">
            <BarList empty="None yet." bars={s.vouchers.slice(0, 10).map((u) => ({ key: u.key, label: name(u.key), value: u.count }))} />
          </Panel>
        </div>
      </div>
      <p className="muted footnote">
        <Icon name="info" /> As in the game, runs with a chosen seed and challenges don't count.
      </p>
    </>
  );
}

function Fact({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="facts__row">
      <dt>{label}</dt>
      <dd>{typeof value === 'number' ? format_number(value) : value}</dd>
    </div>
  );
}
