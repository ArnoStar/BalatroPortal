import { MultiplayerPanel } from '@/widgets/multiplayer';
import { DeckGlyph, deck_name, stake_name, useCatalogNames } from '@/entities/catalog';
import { describe, game_api, type PlayerStats } from '@/shared/api';
import { GAME_URL } from '@/shared/config';
import { format_number, format_percent, use_async } from '@/shared/lib';
import {
  Alert, AnchorButton, BarList, ColumnChart, CountUp, EmptyState, Icon, LinkButton, Meter, PageHeader, Panel, Ring, Spinner, StatTile,
} from '@/shared/ui';
import { current_lang, fmt_number, hand_name, t, tp, tx } from '@/shared/i18n';

const day = { format: (d: Date) => new Intl.DateTimeFormat(current_lang(), { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(d) };

/** The game's Profile > Stats, from the player's runs on this site. */
export function StatsPage() {
  const { data, error, loading } = use_async(() => game_api.player_stats(), []);
  return (
    <div className="stack">
      <PageHeader
        eyebrow={t('You')}
        icon="chart"
        title={t('Your stats')}
        lead={t('Your runs on this site in numbers, like the game’s Profile › Stats.')}
        actions={
          <LinkButton to="/players/me" tone="grey" icon={<Icon name="user" />} viewTransition>
            {t('Your profile')}
          </LinkButton>
        }
      />
      {loading && !data ? <Spinner /> : null}
      {error ? <Alert>{describe(error)}</Alert> : null}
      {data ? data.runs.counted ? <Stats s={data} /> : <NoRuns total={data.runs.total} /> : null}
      <Multiplayer />
    </div>
  );
}

/** your PvP and coop numbers and latest matches */
function Multiplayer() {
  const { data, error } = use_async(() => Promise.all([game_api.multiplayer_stats(), game_api.match_history(10)]), []);
  if (error) return <Alert>{describe(error)}</Alert>;
  if (!data) return null;
  return <MultiplayerPanel stats={data[0]} matches={data[1].matches} you />;
}

function NoRuns({ total }: { total: number }) {
  return (
    <Panel>
      <EmptyState
        icon="chart"
        title={total ? t('None of your runs count yet') : t('No run yet')}
        action={
          <AnchorButton href={`${GAME_URL}/`} icon={<Icon name="play" />}>
            {t('Play a run')}
          </AnchorButton>
        }
      >
        {total ? t('As in the game, runs with a chosen seed and challenges stay out of the stats.') : t('Your stats appear after your first run.')}
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
      <section className="stats-hero" aria-label={t('Your best')}>
        <div className="stats-hero__main">
          <p className="eyebrow">
            <Icon name="zap" /> {t('Best hand')}
          </p>
          <p className="hero-figure">{typeof h.best_hand === 'number' ? <CountUp value={h.best_hand} /> : format_number(h.best_hand)}</p>
          <p className="stats-hero__sub">
            {h.most_played_hand ? (
              <>
                {tx('Most played hand: {hand}, {times}', { hand: <strong>{hand_name(h.most_played_hand.key)}</strong>, times: tp(h.most_played_hand.count, '# time', '# times') })}
              </>
            ) : (
              t('No hand played yet')
            )}
          </p>
        </div>
        <div className="stats-hero__ring">
          <Ring value={runs.won} max={finished} label={t('Won {won} of {finished} finished runs', { won: runs.won, finished })} />
          <div>
            <strong>{format_percent(runs.won, finished)}</strong>
            <span>{t('win rate')}</span>
            <small>
              {t('{won} of {runs}', { won: fmt_number(runs.won), runs: tp(finished, '# finished run', '# finished runs') })}
            </small>
          </div>
        </div>
      </section>

      <section className="tiles" aria-label={t('Runs')}>
        <StatTile
          icon="layers"
          accent="violet"
          label={t('Runs')}
          value={<CountUp value={runs.counted} />}
          hint={runs.total > runs.counted ? t('{runs} not counted', { runs: tp(runs.total - runs.counted, '# other run', '# other runs') }) : undefined}
        />
        <StatTile icon="check-circle" accent="green" label={t('Won')} value={<CountUp value={runs.won} />} />
        <StatTile icon="x-circle" accent="red" label={t('Lost')} value={<CountUp value={runs.lost} />} />
        <StatTile icon="pulse" accent="blue" label={t('In progress')} value={<CountUp value={runs.in_progress} />} />
      </section>

      <Panel title={t('High scores')} icon="trophy">
        <div className="tiles">
          <StatTile icon="target" accent="blue" label={t('Highest ante')} value={<CountUp value={h.highest_ante} />} />
          <StatTile icon="layers" accent="violet" label={t('Highest round')} value={<CountUp value={h.highest_round} />} />
          <StatTile icon="coins" accent="gold" label={t('Most money')} value={<span className="money">${format_number(h.most_money)}</span>} />
          <StatTile icon="flame" accent="red" label={t('Most bosses in a row')} value={<CountUp value={h.boss_streak} />} />
          <StatTile icon="zap" accent="orange" label={t('Best win streak')} value={<CountUp value={h.best_win_streak} />} hint={t('Current: {n}', { n: h.current_win_streak })} />
        </div>
      </Panel>

      <Panel title={t('Last 30 days')} icon="calendar">
        <ColumnChart
          unit={t('runs')}
          caption={t('Runs started per day (UTC)')}
          columns={s.activity.map((d) => ({
            key: d.date,
            label: day.format(new Date(`${d.date}T00:00:00Z`)),
            value: d.runs,
            detail: d.runs ? t('{n} won', { n: d.wins }) : undefined,
          }))}
        />
      </Panel>

      <div className="grid-2">
        <Panel title={t('Poker hands played')} icon="cards">
          <BarList bars={s.hands.map((u) => ({ key: u.key, label: hand_name(u.key), value: u.count }))} />
        </Panel>
        <Panel title={t('Career')} icon="history">
          <dl className="facts">
            <Fact label={t('Hands played')} value={c.hands_played} />
            <Fact label={t('Cards played')} value={c.cards_played} />
            <Fact label={t('Face cards played')} value={c.face_cards_played} />
            <Fact label={t('Cards discarded')} value={c.cards_discarded} />
            <Fact label={t('Rounds')} value={c.rounds} />
            <Fact label={t('Money earned')} value={`$${format_number(c.dollars_earned)}`} />
            <Fact label={t('Spent in shops')} value={`$${format_number(c.shop_dollars_spent)}`} />
            <Fact label={t('Shop rerolls')} value={c.shop_rerolls} />
            <Fact label={t('Jokers sold')} value={c.jokers_sold} />
            <Fact label={t('Cards sold')} value={c.cards_sold} />
            <Fact label={t('Tarots bought')} value={c.tarots_bought} />
            <Fact label={t('Planets bought')} value={c.planets_bought} />
            <Fact label={t('Playing cards bought')} value={c.playing_cards_bought} />
            <Fact label={t('Vouchers bought')} value={c.vouchers_bought} />
            <Fact label={t('Arcana packs finished')} value={c.tarot_readings_used} />
            <Fact label={t('Celestial packs finished')} value={c.planetariums_used} />
          </dl>
        </Panel>
      </div>

      <Panel title={t('Decks')} icon="layers">
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">{t('Deck')}</th>
                <th scope="col" className="num">{t('Runs')}</th>
                <th scope="col" className="num">{t('Won')}</th>
                <th scope="col" className="num">{t('Lost')}</th>
                <th scope="col">{t('Win rate')}</th>
                <th scope="col">{t('Best stake won')}</th>
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
                      <Meter value={d.wins} max={d.wins + d.losses} label={`${deck_name(d.deck)}: ${t('won {a} of {b}', { a: d.wins, b: d.wins + d.losses })}`} />
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
        <Panel title={t('Jokers')} icon="sparkles">
          <BarList
            empty={t('No joker kept through a round yet.')}
            bars={s.jokers.slice(0, 15).map((j) => ({
              key: j.key,
              label: name(j.key),
              value: j.rounds,
              text: tp(j.rounds, '# round', '# rounds'),
              detail: j.wins ? (j.best_stake_won ? t('won with it {n}×, up to {stake}', { n: j.wins, stake: stake_name(j.best_stake_won) }) : t('won with it {n}×', { n: j.wins })) : undefined,
            }))}
          />
        </Panel>
        <div className="stack">
          <Panel title={t('Consumables used')} icon="wand">
            <BarList empty={t('None yet.')} bars={s.consumables.slice(0, 10).map((u) => ({ key: u.key, label: name(u.key), value: u.count }))} />
          </Panel>
          <Panel title={t('Vouchers redeemed')} icon="note">
            <BarList empty={t('None yet.')} bars={s.vouchers.slice(0, 10).map((u) => ({ key: u.key, label: name(u.key), value: u.count }))} />
          </Panel>
        </div>
      </div>
      <p className="muted footnote">
        <Icon name="info" /> {t('As in the game, runs with a chosen seed and challenges don’t count.')}
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
