import type { CSSProperties } from 'react';
import { Link, useParams } from 'react-router';
import { DeckGlyph, deck_name, stake_name, useCatalogNames } from '@/entities/catalog';
import { ItemArt, ItemCard, item_label } from '@/entities/item';
import { RunCard } from '@/widgets/run-card';
import { ProblemError, describe, game_api, items_api, type CollectionView, type Item, type ItemsPlayer, type PlayerProfile } from '@/shared/api';
import { format_number, format_percent, use_async } from '@/shared/lib';
import { Alert, Avatar, CountUp, EmptyState, Icon, LinkButton, Panel, Ring, Spinner, StatTile, hue_of, plural } from '@/shared/ui';

/** /players/:id (``me``: your own): a player's stats, items, collection and recent runs */
export function PlayerPage() {
  const { id = 'me' } = useParams();
  const { data, error, loading } = use_async(async () => {
    const player_id = id === 'me' ? (await game_api.me()).id : id;
    return game_api.player(player_id);
  }, [id]);
  if (loading && !data) return <Spinner />;
  if (error) {
    return (
      <Panel title="Player" icon="user">
        <Alert>{describe(error)}</Alert>
      </Panel>
    );
  }
  if (!data) return null;
  return <Profile p={data} />;
}

/** the player's items (the item service: inventories are public, to trade); null: none yet */
function use_items(player: string) {
  return use_async(async () => {
    try {
      const [who, items] = await Promise.all([items_api.player(player), items_api.player_items(player)]);
      return { who, items };
    } catch (e) {
      if (e instanceof ProblemError && e.code === 'player_not_found') return null; // no item yet
      throw e;
    }
  }, [player]);
}

function Profile({ p }: { p: PlayerProfile }) {
  const items = use_items(p.id);
  const name = p.name ?? 'A player';
  const s = p.stats;
  const finished = s ? s.runs.won + s.runs.lost : 0;
  return (
    <div className="stack">
      <section className="profile" style={{ '--h': hue_of(name) } as CSSProperties} aria-labelledby="profile-name">
        <div className="profile__banner" aria-hidden />
        <Avatar name={name} size="xl" className="profile__avatar" />
        <div className="profile__text">
          <p className="eyebrow">
            <Icon name="user" /> {p.you ? 'Your profile' : 'Player'}
          </p>
          <h1 className="profile__name" id="profile-name">
            {name}
            {p.you ? <span className="tag tag--you">You</span> : null}
            {p.private ? (
              <span className="tag tag--muted">
                <Icon name="lock" /> Private
              </span>
            ) : null}
          </h1>
          {s ? (
            <ul className="profile__facts">
              <li>
                <strong>{s.runs.counted.toLocaleString('en-US')}</strong> runs
              </li>
              <li>
                <strong>{s.runs.won.toLocaleString('en-US')}</strong> won
              </li>
              <li>
                <strong>{format_percent(s.runs.won, finished)}</strong> win rate
              </li>
              <li>
                best hand <strong>{format_number(s.high_scores.best_hand)}</strong>
              </li>
            </ul>
          ) : (
            <p className="muted">This profile is private: only the name shows.</p>
          )}
          {p.you ? (
            <p className="muted profile__note">
              This is how others see your profile{p.private ? ' (it is private: they see only your name)' : ''}.{' '}
              <Link to="/account" viewTransition>
                Change it in your account
              </Link>
              .
            </p>
          ) : null}
        </div>
        {items.data?.who.showcase ? <Showcase item={items.data.who.showcase} you={p.you} /> : null}
      </section>

      {s ? (
        <section className="tiles" aria-label="High scores">
          <StatTile icon="zap" accent="gold" label="Best hand" value={typeof s.high_scores.best_hand === 'number' ? <CountUp value={s.high_scores.best_hand} /> : format_number(s.high_scores.best_hand)} />
          <StatTile icon="target" accent="blue" label="Highest ante" value={<CountUp value={s.high_scores.highest_ante} />} />
          <StatTile icon="flame" accent="red" label="Bosses in a row" value={<CountUp value={s.high_scores.boss_streak} />} />
          <StatTile icon="zap" accent="orange" label="Best win streak" value={<CountUp value={s.high_scores.best_win_streak} />} />
          <StatTile
            icon="cards"
            accent="violet"
            label="Most played hand"
            value={s.high_scores.most_played_hand ? s.high_scores.most_played_hand.key : '–'}
            hint={s.high_scores.most_played_hand ? plural(s.high_scores.most_played_hand.count, 'time') : undefined}
          />
        </section>
      ) : null}

      <Items player={p.id} you={p.you} state={items} />
      {p.collection ? <Collection c={p.collection} /> : null}
      {s ? (
        <Panel title={p.you ? 'Your recent runs' : 'Recent runs'} icon="history">
          {p.runs.length ? (
            <ul className="runs">
              {p.runs.map((run) => (
                <RunCard key={run.id} run={run} watch />
              ))}
            </ul>
          ) : (
            <EmptyState icon="play" title={p.you ? 'No run yet' : 'No finished run yet'} />
          )}
        </Panel>
      ) : null}
    </div>
  );
}

/** the item the player shows on their title screen */
function Showcase({ item, you }: { item: Item; you: boolean }) {
  return (
    <Link to={`/item/${item.id}`} className="profile__showcase" title={item_label(item)} viewTransition>
      <span className="profile__showcase-art">
        <ItemArt item={item} scale={1.6} />
      </span>
      <span className="profile__showcase-label">
        <Icon name="star" /> On {you ? 'your' : 'their'} title screen
      </span>
    </Link>
  );
}

const COLLECTION: [string, keyof CollectionView][] = [
  ['Jokers', 'jokers'], ['Decks unlocked', 'decks'], ['Tarot cards', 'tarots'], ['Planet cards', 'planets'],
  ['Spectral cards', 'spectrals'], ['Vouchers', 'vouchers'], ['Booster packs', 'boosters'], ['Editions', 'editions'],
  ['Blinds', 'blinds'], ['Tags', 'tags'], ['Challenges completed', 'challenges'],
];

function Collection({ c }: { c: CollectionView }) {
  const name = useCatalogNames();
  const stakes = Object.entries(c.deck_stakes).sort((a, b) => b[1] - a[1]);
  return (
    <Panel title="Collection" icon="layers">
      <ul className="collection">
        {COLLECTION.map(([label, key]) => {
          const n = c[key] as { found: number; total: number };
          return (
            <li key={key} className="collection__item">
              <Ring value={n.found} max={n.total} label={`${label}: ${n.found} of ${n.total}`} />
              <span>
                <strong>{label}</strong>
                <small>
                  {n.found} / {n.total}
                </small>
              </span>
            </li>
          );
        })}
      </ul>
      <h3 className="subhead">Stakes won</h3>
      {stakes.length ? (
        <ul className="stakes-won">
          {stakes.map(([deck, stake]) => (
            <li key={deck}>
              <DeckGlyph deck={deck} size="sm" />
              <span>{name(deck) === deck ? deck_name(deck) : name(deck)}</span>
              <span className={`stake stake--${stake}`}>{stake_name(stake)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">No win yet.</p>
      )}
    </Panel>
  );
}

function Items({ player, you, state }: {
  player: string; you: boolean; state: { data: { who: ItemsPlayer; items: Item[] } | null | undefined; error: unknown; loading: boolean };
}) {
  const { data, error, loading } = state;
  if (loading && data === undefined) return null;
  return (
    <Panel
      title={you ? 'Your items' : 'Items'}
      icon="cards"
      actions={
        you ? (
          <LinkButton to="/inventory" tone="grey" size="sm" viewTransition>
            All your items <Icon name="arrow-right" />
          </LinkButton>
        ) : data?.who.can_trade ? (
          <LinkButton to={`/trades/new?to=${encodeURIComponent(player)}`} tone="orange" size="sm" icon={<Icon name="swap" />} viewTransition>
            Offer a trade
          </LinkButton>
        ) : null
      }
    >
      {error ? <Alert>{describe(error)}</Alert> : null}
      {data === null || data?.items.length === 0 ? <EmptyState icon="cards" title="No item yet" /> : null}
      {data?.items.length ? (
        <ul className="item-grid">
          {data.items.map((i, n) => (
            <ItemCard key={i.id} item={i} to={`/item/${i.id}`} index={n} />
          ))}
        </ul>
      ) : null}
    </Panel>
  );
}
