import { DeckGlyph, deck_name, stake_name, useCatalogNames } from '@/entities/catalog';
import { describe, game_api } from '@/shared/api';
import { format_number, format_percent, use_async } from '@/shared/lib';
import { Alert, BarList, CountUp, Icon, Panel, Spinner, StatTile } from '@/shared/ui';
import { fmt_number, hand_name, t, tp } from '@/shared/i18n';

/** Everyone's counted runs together. */
export function Everyone() {
  const { data, error, loading } = use_async(() => game_api.global_stats(), []);
  const name = useCatalogNames();
  if (loading && !data) return <Spinner />;
  if (error) return <Alert>{describe(error)}</Alert>;
  if (!data) return null;
  const finished = data.won + data.lost;
  return (
    <section className="stack" aria-labelledby="everyone-title">
      <div className="section-head">
        <div>
          <p className="eyebrow">
            <Icon name="users" /> {t('All players')}
          </p>
          <h2 className="section-title" id="everyone-title">
            {t('Everyone')}
          </h2>
        </div>
      </div>
      <div className="tiles" aria-label={t('Everyone’s runs')}>
        <StatTile icon="users" accent="violet" label={t('Players')} value={<CountUp value={data.players} />} />
        <StatTile icon="layers" accent="blue" label={t('Runs')} value={<CountUp value={data.runs} />} />
        <StatTile
          icon="check-circle"
          accent="green"
          label={t('Won')}
          value={<CountUp value={data.won} />}
          hint={finished ? `${format_percent(data.won, finished)} of finished runs` : undefined}
        />
        <StatTile icon="cards" accent="orange" label={t('Hands played')} value={<CountUp value={data.hands_played} />} />
        <StatTile icon="zap" accent="gold" label={t('Best hand')} value={typeof data.best_hand === 'number' ? <CountUp value={data.best_hand} /> : format_number(data.best_hand)} />
        <StatTile icon="target" accent="red" label={t('Highest ante')} value={<CountUp value={data.highest_ante} />} />
      </div>
      <div className="grid-2">
        <Panel title={t('Decks played')} icon="layers">
          <BarList
            bars={data.decks.map((d) => ({
              key: d.deck,
              label: (
                <span className="deck-name">
                  <DeckGlyph deck={d.deck} size="sm" />
                  {deck_name(d.deck)}
                </span>
              ),
              value: d.runs,
              text: tp(d.runs, '# run', '# runs'),
              detail: t('{n} won', { n: fmt_number(d.wins) }),
            }))}
          />
        </Panel>
        <Panel title={t('Stakes played')} icon="coins">
          <BarList
            bars={data.stakes.map((s) => ({
              key: String(s.stake),
              label: <span className={`stake stake--${s.stake}`}>{stake_name(s.stake)}</span>,
              value: s.runs,
              text: tp(s.runs, '# run', '# runs'),
              detail: t('{n} won', { n: fmt_number(s.wins) }),
            }))}
          />
        </Panel>
        <Panel title={t('Most kept jokers')} icon="sparkles">
          <BarList
            bars={data.jokers.map((j) => ({
              key: j.key,
              label: name(j.key),
              value: j.runs,
              text: tp(j.runs, '# run', '# runs'),
              detail: j.win_runs ? tp(j.win_runs, 'in # won run', 'in # won runs') : undefined,
            }))}
          />
        </Panel>
        <Panel title={t('Poker hands played')} icon="cards">
          <BarList bars={data.hands.map((u) => ({ key: u.key, label: hand_name(u.key), value: u.count }))} />
        </Panel>
      </div>
    </section>
  );
}
