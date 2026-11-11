import { useMemo, useState, type CSSProperties } from 'react';
import { Link } from 'react-router';
import { EDITION_NAMES, ItemArt, ItemCard, RARITY_NAMES, item_label } from '@/entities/item';
import { describe, items_api, type Item, type Odds, type Week } from '@/shared/api';
import { time_left, use_async } from '@/shared/lib';
import { Alert, Button, EmptyState, Icon, LinkButton, PageHeader, Panel, Segmented, Spinner } from '@/shared/ui';

const date = (iso: string) => new Date(iso).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });

type Kind = 'all' | 'joker' | 'tag';
type Order = 'newest' | 'rarest' | 'rarity';

const ORDERS: Record<Order, (a: Item, b: Item) => number> = {
  newest: (a, b) => Date.parse(b.acquired_at) - Date.parse(a.acquired_at),
  rarest: (a, b) => b.odds - a.odds,
  rarity: (a, b) => b.rarity - a.rarity || b.odds - a.odds,
};

/** /inventory: your items, this week's drops, how items are found */
export function InventoryPage() {
  const me = use_async(() => items_api.me(), []);
  const items = use_async(() => items_api.mine(), []);
  const [found, setFound] = useState<Item[] | null>(null);
  const [finding, setFinding] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [kind, setKind] = useState<Kind>('all');
  const [order, setOrder] = useState<Order>('newest');

  const shown = useMemo(
    () => (items.data ?? []).filter((i) => kind === 'all' || i.kind === kind).sort(ORDERS[order]),
    [items.data, kind, order],
  );

  async function find() {
    setFinding(true);
    setError(null);
    try {
      const r = await items_api.find();
      setFound(r.found);
      me.reload();
      items.reload();
    } catch (e) {
      setError(e);
    } finally {
      setFinding(false);
    }
  }

  if (me.loading && !me.data) return <Spinner />;
  if (me.error) {
    return (
      <Panel title="Your items" icon="cards">
        <Alert>{describe(me.error)}</Alert>
      </Panel>
    );
  }
  const m = me.data!;
  const count = (k: Kind) => (items.data ?? []).filter((i) => k === 'all' || i.kind === k).length;
  return (
    <div className="stack">
      <PageHeader
        eyebrow="Items"
        icon="cards"
        title={
          <>
            Your items <span className="tag">{m.items}</span>
          </>
        }
        lead="The game's jokers and tags, found by playing and kept on your account. They change nothing in a run: show one on your title screen and profile, and trade them with other players."
        actions={
          <>
            <Button onClick={find} busy={finding} icon={<Icon name="sparkles" />}>
              Look for new items
            </Button>
            <LinkButton to="/trades" tone="orange" icon={<Icon name="swap" />} viewTransition>
              Trades
            </LinkButton>
            <LinkButton to="/casino" tone="grey" icon={<Icon name="dice" />} viewTransition>
              Casino
            </LinkButton>
          </>
        }
      />
      {!m.can_trade ? <Alert tone="info">Trading opens after your first win.</Alert> : null}
      {error ? <Alert>{describe(error)}</Alert> : null}
      <ThisWeek week={m.week} />
      {found !== null ? <Found items={found} onClose={() => setFound(null)} /> : null}
      <Panel
        title="Your collection"
        icon="layers"
        actions={
          items.data?.length ? (
            <>
              <Segmented
                label="Show"
                value={kind}
                onChange={setKind}
                options={[['all', `All ${count('all')}`], ['joker', `Jokers ${count('joker')}`], ['tag', `Tags ${count('tag')}`]]}
              />
              <label className="select select--inline">
                <span>Order</span>
                <select value={order} onChange={(e) => setOrder(e.target.value as Order)}>
                  <option value="newest">Newest first</option>
                  <option value="rarest">Rarest drop first</option>
                  <option value="rarity">By rarity</option>
                </select>
              </label>
            </>
          ) : null
        }
      >
        {items.loading && !items.data ? <Spinner /> : null}
        {items.error ? <Alert>{describe(items.error)}</Alert> : null}
        {shown.length ? (
          <ul className="item-grid">
            {shown.map((i, n) => (
              <ItemCard key={i.id} item={i} to={`/item/${i.id}`} index={n}>
                {m.showcase?.id === i.id ? (
                  <span className="tag tag--gold">
                    <Icon name="star" /> On your title screen
                  </span>
                ) : null}
                {i.staked ? (
                  <Link className="tag tag--warn" to={`/casino/${encodeURIComponent(i.staked)}`} viewTransition>
                    <Icon name="dice" /> In the casino
                  </Link>
                ) : null}
              </ItemCard>
            ))}
          </ul>
        ) : items.data ? (
          <EmptyState icon="gift" title={items.data.length ? 'None of this kind' : 'No item yet'}>
            {items.data.length ? null : 'Finish a run at ante 3 or later this week, or win one.'}
          </EmptyState>
        ) : null}
      </Panel>
      <HowToFind />
    </div>
  );
}

function ThisWeek({ week }: { week: Week }) {
  const left = Date.parse(week.next_week_at) - Date.now();
  return (
    <ul className="week-cards" aria-label="This week">
      <li className={week.weekly_found ? 'is-done' : undefined}>
        <span className="week-cards__icon">
          <Icon name={week.weekly_found ? 'check' : 'target'} />
        </span>
        <span>
          <strong>This week's item</strong>
          <small>{week.weekly_found ? 'Found' : 'A run to ante 3'}</small>
        </span>
      </li>
      <li className={week.weekly_win_found ? 'is-done' : undefined}>
        <span className="week-cards__icon">
          <Icon name={week.weekly_win_found ? 'check' : 'trophy'} />
        </span>
        <span>
          <strong>This week's win</strong>
          <small>{week.weekly_win_found ? 'Found' : 'Win a run'}</small>
        </span>
      </li>
      <li>
        <span className="week-cards__icon">
          <Icon name="clock" />
        </span>
        <span>
          <strong>New week in {time_left(left)}</strong>
          <small>{date(week.next_week_at)}</small>
        </span>
      </li>
    </ul>
  );
}

/** the items just found, dealt face down and turned over one by one */
function Found({ items, onClose }: { items: Item[]; onClose: () => void }) {
  if (!items.length) {
    return (
      <Alert tone="info">
        Nothing new for now: play on!{' '}
        <button type="button" className="link" onClick={onClose}>
          Close
        </button>
      </Alert>
    );
  }
  return (
    <section className="found" aria-labelledby="found-title">
      <div className="found__rays" aria-hidden />
      <h2 className="found__title" id="found-title">
        You found {items.length === 1 ? 'an item' : `${items.length} items`}!
      </h2>
      <ul className="found__cards">
        {items.map((item, n) => (
          <li key={item.id} className={`flip-card flip-card--r${item.rarity}`} style={{ '--i': n } as CSSProperties}>
            <div className="flip-card__inner">
              <div className="flip-card__back" aria-hidden>
                <Icon name="sparkle" />
              </div>
              <Link className="flip-card__front" to={`/item/${item.id}`} title={item_label(item)} viewTransition>
                <ItemArt item={item} scale={1.7} />
                <strong>{item.name}</strong>
                <span className="item-card__meta">
                  <span className={`rarity rarity--${item.rarity}`}>{RARITY_NAMES[item.rarity]}</span>
                  {item.edition !== 'base' ? <span className={`edition edition--${item.edition}`}>{EDITION_NAMES[item.edition]}</span> : null}
                </span>
              </Link>
            </div>
          </li>
        ))}
      </ul>
      <Button tone="grey" onClick={onClose}>
        Close
      </Button>
    </section>
  );
}

function HowToFind() {
  const odds = use_async(() => items_api.odds(), []);
  return (
    <Panel title="How items are found" icon="info">
      <p className="muted">
        Only counted runs (not seeded, no challenge) find items, and each of these once: nothing can be farmed, so even
        a common item is worth something.
      </p>
      {odds.data ? <OddsTables odds={odds.data} /> : odds.error ? <Alert>{describe(odds.error)}</Alert> : <Spinner />}
    </Panel>
  );
}

function OddsTables({ odds }: { odds: Odds }) {
  const pct = (v: number) => `${v.toLocaleString('en', { maximumFractionDigits: 2 })}%`;
  const row = (label: string, pick: (t: Odds['tables'][number]) => Record<string, number>) => (
    <tr>
      <th scope="row">{label}</th>
      {odds.tables.map((t) => (
        <td key={t.name}>
          <ul className="odds">
            {Object.entries(pick(t)).map(([k, v]) => (
              <li key={k}>
                <span>{k}</span>
                <span className="odds__value">{pct(v)}</span>
              </li>
            ))}
          </ul>
        </td>
      ))}
    </tr>
  );
  return (
    <>
      <ul className="rules">
        {odds.rules.map((r) => (
          <li key={r.source}>
            <Icon name="gift" />
            <span>
              {r.description} <em>({r.table})</em>
            </span>
          </li>
        ))}
      </ul>
      <div className="table-scroll">
        <table className="table table--odds">
          <thead>
            <tr>
              <td />
              {odds.tables.map((t) => (
                <th key={t.name} scope="col">
                  {t.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {row('Kind', (t) => t.kinds)}
            {row('Rarity', (t) => t.rarities)}
            {row('Edition', (t) => t.editions)}
          </tbody>
        </table>
      </div>
      <p className="muted">
        An item that changes hands (or is found) can't be traded again for {odds.trade_hold_days} days. Offers stay open{' '}
        {odds.offer_days} days.
      </p>
    </>
  );
}
