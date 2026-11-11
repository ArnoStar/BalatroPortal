import { DeckGlyph, deck_name, stake_name, useCatalogNames } from '@/entities/catalog';
import { describe, game_api } from '@/shared/api';
import { format_number, format_percent, use_async } from '@/shared/lib';
import { Alert, BarList, CountUp, Icon, Panel, Spinner, StatTile, plural } from '@/shared/ui';

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
            <Icon name="users" /> All players
          </p>
          <h2 className="section-title" id="everyone-title">
            Everyone
          </h2>
        </div>
      </div>
      <div className="tiles" aria-label="Everyone's runs">
        <StatTile icon="users" accent="violet" label="Players" value={<CountUp value={data.players} />} />
        <StatTile icon="layers" accent="blue" label="Runs" value={<CountUp value={data.runs} />} />
        <StatTile
          icon="check-circle"
          accent="green"
          label="Won"
          value={<CountUp value={data.won} />}
          hint={finished ? `${format_percent(data.won, finished)} of finished runs` : undefined}
        />
        <StatTile icon="cards" accent="orange" label="Hands played" value={<CountUp value={data.hands_played} />} />
        <StatTile icon="zap" accent="gold" label="Best hand" value={typeof data.best_hand === 'number' ? <CountUp value={data.best_hand} /> : format_number(data.best_hand)} />
        <StatTile icon="target" accent="red" label="Highest ante" value={<CountUp value={data.highest_ante} />} />
      </div>
      <div className="grid-2">
        <Panel title="Decks played" icon="layers">
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
              text: plural(d.runs, 'run'),
              detail: `${d.wins.toLocaleString('en-US')} won`,
            }))}
          />
        </Panel>
        <Panel title="Stakes played" icon="coins">
          <BarList
            bars={data.stakes.map((s) => ({
              key: String(s.stake),
              label: <span className={`stake stake--${s.stake}`}>{stake_name(s.stake)}</span>,
              value: s.runs,
              text: plural(s.runs, 'run'),
              detail: `${s.wins.toLocaleString('en-US')} won`,
            }))}
          />
        </Panel>
        <Panel title="Most kept jokers" icon="sparkles">
          <BarList
            bars={data.jokers.map((j) => ({
              key: j.key,
              label: name(j.key),
              value: j.runs,
              text: plural(j.runs, 'run'),
              detail: j.win_runs ? `in ${plural(j.win_runs, 'won run')}` : undefined,
            }))}
          />
        </Panel>
        <Panel title="Poker hands played" icon="cards">
          <BarList bars={data.hands.map((u) => ({ key: u.key, label: u.key, value: u.count }))} />
        </Panel>
      </div>
    </section>
  );
}
