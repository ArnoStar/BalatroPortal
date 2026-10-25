import { deck_name, stake_name, useCatalogNames } from '@/entities/catalog';
import { describe, game_api, type PlayerStats } from '@/shared/api';
import { GAME_URL } from '@/shared/config';
import { format_number, format_percent, use_async } from '@/shared/lib';
import { Alert, BarList, ColumnChart, Panel, Spinner, StatTile, plural } from '@/shared/ui';

const day = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });

/** The game's Profile > Stats, from the player's runs on this site. */
export function StatsPage() {
  const { data, error, loading } = use_async(() => game_api.player_stats(), []);
  if (loading && !data) return <Spinner />;
  if (error) return <Alert>{describe(error)}</Alert>;
  if (!data) return null;
  return (
    <div className="stack">
      <h1 className="page-title">Your stats</h1>
      {data.runs.counted ? <Stats s={data} /> : <NoRuns total={data.runs.total} />}
    </div>
  );
}

function NoRuns({ total }: { total: number }) {
  return (
    <Panel>
      <p className="muted">
        {total
          ? 'None of your runs count yet: as in the game, runs with a chosen seed and challenges stay out of the stats.'
          : 'No run yet.'}{' '}
        <a href={`${GAME_URL}/`}>Play a run</a>.
      </p>
    </Panel>
  );
}

function Stats({ s }: { s: PlayerStats }) {
  const name = useCatalogNames();
  const { runs, high_scores: h, career: c } = s;
  const finished = runs.won + runs.lost;
  return (
    <>
      <section className="tiles" aria-label="Runs">
        <StatTile label="Runs" value={runs.counted} hint={runs.total > runs.counted ? `${plural(runs.total - runs.counted, 'other run')} not counted` : undefined} />
        <StatTile label="Won" value={runs.won} hint={finished ? `${format_percent(runs.won, finished)} of finished runs` : undefined} />
        <StatTile label="Lost" value={runs.lost} />
        <StatTile label="In progress" value={runs.in_progress} />
      </section>

      <Panel title="High scores">
        <div className="tiles">
          <StatTile label="Best hand" value={format_number(h.best_hand)} />
          <StatTile label="Highest ante" value={h.highest_ante} />
          <StatTile label="Highest round" value={h.highest_round} />
          <StatTile label="Most money" value={<span className="money">${format_number(h.most_money)}</span>} />
          <StatTile label="Most bosses in a row" value={h.boss_streak} />
          <StatTile label="Best win streak" value={h.best_win_streak} hint={`current: ${h.current_win_streak}`} />
          <StatTile
            label="Most played hand"
            value={h.most_played_hand ? h.most_played_hand.key : '–'}
            hint={h.most_played_hand ? plural(h.most_played_hand.count, 'time') : undefined}
          />
        </div>
      </Panel>

      <Panel title="Last 30 days">
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
        <Panel title="Poker hands played">
          <BarList bars={s.hands.map((u) => ({ key: u.key, label: u.key, value: u.count }))} />
        </Panel>
        <Panel title="Career">
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

      <Panel title="Decks">
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Deck</th>
                <th scope="col" className="num">Runs</th>
                <th scope="col" className="num">Won</th>
                <th scope="col" className="num">Lost</th>
                <th scope="col" className="num">Win rate</th>
                <th scope="col">Best stake won</th>
              </tr>
            </thead>
            <tbody>
              {s.decks.map((d) => (
                <tr key={d.deck}>
                  <th scope="row">{deck_name(d.deck)}</th>
                  <td className="num">{d.runs}</td>
                  <td className="num">{d.wins}</td>
                  <td className="num">{d.losses}</td>
                  <td className="num">{format_percent(d.wins, d.wins + d.losses)}</td>
                  <td>{d.best_stake_won ? <span className={`stake stake--${d.best_stake_won}`}>{stake_name(d.best_stake_won)}</span> : '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="grid-2">
        <Panel title="Jokers">
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
          <Panel title="Consumables used">
            <BarList empty="None yet." bars={s.consumables.slice(0, 10).map((u) => ({ key: u.key, label: name(u.key), value: u.count }))} />
          </Panel>
          <Panel title="Vouchers redeemed">
            <BarList empty="None yet." bars={s.vouchers.slice(0, 10).map((u) => ({ key: u.key, label: name(u.key), value: u.count }))} />
          </Panel>
        </div>
      </div>
      <p className="muted">As in the game, runs with a chosen seed and challenges don't count.</p>
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
