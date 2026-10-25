import { deck_name, stake_name, useCatalogNames } from '@/entities/catalog';
import { describe, game_api } from '@/shared/api';
import { format_number, format_percent, use_async } from '@/shared/lib';
import { Alert, BarList, Panel, Spinner, StatTile, plural } from '@/shared/ui';

/** Everyone's counted runs together. */
export function Everyone() {
  const { data, error, loading } = use_async(() => game_api.global_stats(), []);
  const name = useCatalogNames();
  if (loading && !data) return <Spinner />;
  if (error) return <Alert>{describe(error)}</Alert>;
  if (!data) return null;
  const finished = data.won + data.lost;
  return (
    <>
      <h2 className="page-title">Everyone</h2>
      <section className="tiles" aria-label="Everyone's runs">
        <StatTile label="Players" value={format_number(data.players)} />
        <StatTile label="Runs" value={format_number(data.runs)} />
        <StatTile label="Won" value={format_number(data.won)} hint={finished ? `${format_percent(data.won, finished)} of finished runs` : undefined} />
        <StatTile label="Hands played" value={format_number(data.hands_played)} />
        <StatTile label="Best hand" value={format_number(data.best_hand)} />
        <StatTile label="Highest ante" value={data.highest_ante} />
      </section>
      <div className="grid-2">
        <Panel title="Decks played">
          <BarList
            bars={data.decks.map((d) => ({
              key: d.deck,
              label: deck_name(d.deck),
              value: d.runs,
              text: plural(d.runs, 'run'),
              detail: `${d.wins} won`,
            }))}
          />
        </Panel>
        <Panel title="Stakes played">
          <BarList
            bars={data.stakes.map((s) => ({
              key: String(s.stake),
              label: stake_name(s.stake),
              value: s.runs,
              text: plural(s.runs, 'run'),
              detail: `${s.wins} won`,
            }))}
          />
        </Panel>
        <Panel title="Most kept jokers">
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
        <Panel title="Poker hands played">
          <BarList bars={data.hands.map((u) => ({ key: u.key, label: u.key, value: u.count }))} />
        </Panel>
      </div>
    </>
  );
}
