import { useState } from 'react';
import { Link } from 'react-router';
import { ItemCard } from '@/entities/item';
import { describe, items_api, type Item, type Odds, type Week } from '@/shared/api';
import { use_async } from '@/shared/lib';
import { Alert, Button, LinkButton, Panel, Spinner } from '@/shared/ui';

const date = (iso: string) => new Date(iso).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });

/** /inventory: your items, this week's drops, how items are found */
export function InventoryPage() {
  const me = use_async(() => items_api.me(), []);
  const items = use_async(() => items_api.mine(), []);
  const [found, setFound] = useState<Item[] | null>(null);
  const [finding, setFinding] = useState(false);
  const [error, setError] = useState<unknown>(null);

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
      <Panel title="Your items">
        <Alert>{describe(me.error)}</Alert>
      </Panel>
    );
  }
  const m = me.data!;
  return (
    <div className="stack">
      <Panel title={<>Your items <span className="tag">{m.items}</span></>}>
        <p className="muted">
          Items are the game's jokers and tags, found by playing and kept on your account. They change nothing in a
          run: show one on your title screen and profile, and trade them with other players.
        </p>
        <ThisWeek week={m.week} />
        <div className="row">
          <Button onClick={find} busy={finding}>Look for new items</Button>
          <LinkButton to="/trades" tone="orange">Trades</LinkButton>
          <LinkButton to="/casino" tone="red">Casino</LinkButton>
          {!m.can_trade ? <span className="muted">Trading opens after your first win.</span> : null}
        </div>
        {error ? <Alert>{describe(error)}</Alert> : null}
        {found !== null ? (
          found.length ? (
            <>
              <Alert tone="success">You found {found.length === 1 ? 'an item' : `${found.length} items`}!</Alert>
              <ul className="item-grid">{found.map((i) => <ItemCard key={i.id} item={i} to={`/item/${i.id}`} />)}</ul>
            </>
          ) : (
            <Alert tone="info">Nothing new for now: play on!</Alert>
          )
        ) : null}
      </Panel>
      <Panel title="Your collection">
        {items.loading && !items.data ? <Spinner /> : null}
        {items.error ? <Alert>{describe(items.error)}</Alert> : null}
        {items.data?.length ? (
          <ul className="item-grid">
            {items.data.map((i) => (
              <ItemCard key={i.id} item={i} to={`/item/${i.id}`}>
                {m.showcase?.id === i.id ? <span className="tag">On your title screen</span> : null}
                {i.staked ? <Link className="tag tag--warn" to={`/casino/${encodeURIComponent(i.staked)}`}>In the casino</Link> : null}
              </ItemCard>
            ))}
          </ul>
        ) : items.data ? (
          <p className="muted">No item yet. Finish a run at ante 3 or later this week, or win one.</p>
        ) : null}
      </Panel>
      <HowToFind />
    </div>
  );
}

function ThisWeek({ week }: { week: Week }) {
  return (
    <ul className="week plain-list" aria-label="This week">
      <li>{week.weekly_found ? '✔' : '○'} This week's item (a run to ante 3)</li>
      <li>{week.weekly_win_found ? '✔' : '○'} This week's win</li>
      <li className="muted">New week: {date(week.next_week_at)}</li>
    </ul>
  );
}

function HowToFind() {
  const odds = use_async(() => items_api.odds(), []);
  return (
    <Panel title="How items are found">
      <p className="muted">
        Only counted runs (not seeded, no challenge) find items, and each of these once: nothing can be farmed, so
        even a common item is worth something.
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
          {Object.entries(pick(t)).map(([k, v]) => <div key={k}>{k} {pct(v)}</div>)}
        </td>
      ))}
    </tr>
  );
  return (
    <>
      <ul>
        {odds.rules.map((r) => <li key={r.source}>{r.description} — <em>{r.table}</em></li>)}
      </ul>
      <div className="table-scroll">
        <table className="table">
          <thead>
            <tr><th /> {odds.tables.map((t) => <th key={t.name} scope="col">{t.name}</th>)}</tr>
          </thead>
          <tbody>
            {row('Kind', (t) => t.kinds)}
            {row('Rarity', (t) => t.rarities)}
            {row('Edition', (t) => t.editions)}
          </tbody>
        </table>
      </div>
      <p className="muted">
        An item that changes hands (or is found) can't be traded again for {odds.trade_hold_days} days. Offers stay open
        {' '}{odds.offer_days} days.
      </p>
    </>
  );
}
