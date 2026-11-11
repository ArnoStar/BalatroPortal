import { Link, useParams } from 'react-router';
import { deck_name, stake_name, useCatalogNames } from '@/entities/catalog';
import { ItemCard } from '@/entities/item';
import { RunCard } from '@/widgets/run-card';
import { ProblemError, describe, game_api, items_api, type CollectionView, type PlayerProfile } from '@/shared/api';
import { format_number, use_async } from '@/shared/lib';
import { Alert, LinkButton, Panel, Spinner, StatTile, plural } from '@/shared/ui';

/** /players/:id (``me``: your own): a player's stats, collection and recent runs */
export function PlayerPage() {
  const { id = 'me' } = useParams();
  const { data, error, loading } = use_async(async () => {
    const player_id = id === 'me' ? (await game_api.me()).id : id;
    return game_api.player(player_id);
  }, [id]);
  if (loading && !data) return <Spinner />;
  if (error) {
    return (
      <Panel title="Player">
        <Alert>{describe(error)}</Alert>
      </Panel>
    );
  }
  if (!data) return null;
  return <Profile p={data} />;
}

function Profile({ p }: { p: PlayerProfile }) {
  const title = (
    <>
      {p.name ?? 'A player'}
      {p.you ? <span className="tag">You</span> : null}
      {p.private ? <span className="tag tag--muted">Private</span> : null}
    </>
  );
  if (!p.stats) {
    return (
      <div className="stack">
        <Panel title={title}>
          <p className="muted">This profile is private: only the name shows.</p>
        </Panel>
        <Items player={p.id} you={p.you} />
      </div>
    );
  }
  const s = p.stats;
  const h = s.high_scores;
  return (
    <div className="stack">
      <Panel title={title}>
        {p.you ? (
          <p className="muted">
            This is how others see your profile{p.private ? ' (it is private: they see only your name)' : ''}.{' '}
            <Link to="/account">Change it in your account</Link>.
          </p>
        ) : null}
        <section className="tiles" aria-label="Runs">
          <StatTile label="Runs" value={s.runs.counted} />
          <StatTile label="Won" value={s.runs.won} />
          <StatTile label="Lost" value={s.runs.lost} />
          <StatTile label="Best hand" value={format_number(h.best_hand)} />
          <StatTile label="Highest ante" value={h.highest_ante} />
          <StatTile label="Best win streak" value={h.best_win_streak} />
          <StatTile
            label="Most played hand"
            value={h.most_played_hand ? h.most_played_hand.key : '–'}
            hint={h.most_played_hand ? plural(h.most_played_hand.count, 'time') : undefined}
          />
        </section>
      </Panel>
      <Items player={p.id} you={p.you} />
      {p.collection ? <Collection c={p.collection} /> : null}
      <Panel title={p.you ? 'Your recent runs' : 'Recent runs'}>
        {p.runs.length ? (
          <ul className="runs">
            {p.runs.map((run) => <RunCard key={run.id} run={run} watch />)}
          </ul>
        ) : (
          <p className="muted">{p.you ? 'No run yet.' : 'No finished run yet.'}</p>
        )}
      </Panel>
    </div>
  );
}

function Collection({ c }: { c: CollectionView }) {
  const name = useCatalogNames();
  const rows: [string, keyof CollectionView][] = [
    ['Jokers', 'jokers'], ['Decks unlocked', 'decks'], ['Tarot cards', 'tarots'], ['Planet cards', 'planets'],
    ['Spectral cards', 'spectrals'], ['Vouchers', 'vouchers'], ['Booster packs', 'boosters'], ['Editions', 'editions'],
    ['Blinds', 'blinds'], ['Tags', 'tags'], ['Challenges completed', 'challenges'],
  ];
  const stakes = Object.entries(c.deck_stakes).sort((a, b) => b[1] - a[1]);
  return (
    <Panel title="Collection">
      <ul className="collection">
        {rows.map(([label, key]) => {
          const n = c[key] as { found: number; total: number };
          return (
            <li key={key} className="collection__row">
              <span>{label}</span>
              <meter min={0} max={n.total || 1} value={n.found} aria-label={`${label}: ${n.found} of ${n.total}`} />
              <span className="collection__count">{n.found} / {n.total}</span>
            </li>
          );
        })}
      </ul>
      <h3>Stakes won</h3>
      {stakes.length ? (
        <ul className="plain-list">
          {stakes.map(([deck, stake]) => (
            <li key={deck}>
              {name(deck) === deck ? deck_name(deck) : name(deck)}: <span className={`stake stake--${stake}`}>{stake_name(stake)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">No win yet.</p>
      )}
    </Panel>
  );
}

/** the player's items (the item service: inventories are public, to trade) */
function Items({ player, you }: { player: string; you: boolean }) {
  const { data, error, loading } = use_async(async () => {
    try {
      const [who, items] = await Promise.all([items_api.player(player), items_api.player_items(player)]);
      return { who, items };
    } catch (e) {
      if (e instanceof ProblemError && e.code === 'player_not_found') return null; // no item yet
      throw e;
    }
  }, [player]);
  if (loading && data === undefined) return null;
  return (
    <Panel title={you ? 'Your items' : 'Items'}>
      {error ? <Alert>{describe(error)}</Alert> : null}
      {data === null || data?.items.length === 0 ? <p className="muted">No item yet.</p> : null}
      {data?.who.showcase ? (
        <p className="muted">On {you ? 'your' : 'their'} title screen: {data.who.showcase.name}.</p>
      ) : null}
      {data?.items.length ? (
        <ul className="item-grid">{data.items.map((i) => <ItemCard key={i.id} item={i} to={`/item/${i.id}`} />)}</ul>
      ) : null}
      <div className="row">
        {you ? (
          <LinkButton to="/inventory">Your items</LinkButton>
        ) : data?.who.can_trade ? (
          <LinkButton to={`/trades/new?to=${encodeURIComponent(player)}`} tone="orange">Offer a trade</LinkButton>
        ) : null}
      </div>
    </Panel>
  );
}
