import { useState } from 'react';
import { Link } from 'react-router';
import { ItemCard } from '@/entities/item';
import { describe, items_api, type Trade, type TradeBox } from '@/shared/api';
import { use_async } from '@/shared/lib';
import { Alert, Button, LinkButton, Panel, Spinner } from '@/shared/ui';

const BOXES: [TradeBox, string][] = [['incoming', 'Offers to you'], ['outgoing', 'Your offers'], ['all', 'All']];
const STATUS: Record<Trade['status'], string> = {
  pending: 'Open', accepted: 'Accepted', declined: 'Declined', cancelled: 'Cancelled', expired: 'Expired',
};

/** /trades: offers made to you and yours */
export function TradesPage() {
  const [box, setBox] = useState<TradeBox>('incoming');
  const me = use_async(() => items_api.me(), []);
  const trades = use_async(() => items_api.trades(box), [box]);
  return (
    <div className="stack">
      <Panel title="Trades">
        <p className="muted">
          Offer some of your items for some of another player's. They accept (every item changes hands at once),
          decline, or let it expire. Both players need a first win, and an item that changes hands can't be traded
          again for a week.
        </p>
        <div className="row">
          <LinkButton to="/trades/new">Make an offer</LinkButton>
          <LinkButton to="/inventory" tone="grey">Your items</LinkButton>
        </div>
        {me.data && !me.data.can_trade ? <Alert tone="info">Trading opens after your first win (a counted run).</Alert> : null}
        <div className="segmented" role="group" aria-label="Trades">
          {BOXES.map(([b, label]) => (
            <button key={b} type="button" className="segmented__item" aria-pressed={box === b} onClick={() => setBox(b)}>
              {label}
            </button>
          ))}
        </div>
      </Panel>
      {trades.loading && !trades.data ? <Spinner /> : null}
      {trades.error ? <Alert>{describe(trades.error)}</Alert> : null}
      {trades.data?.length === 0 ? <p className="muted">No trade here.</p> : null}
      {trades.data?.map((t) => <TradeBoxView key={t.id} trade={t} me={me.data?.id} onChange={trades.reload} />)}
    </div>
  );
}

function TradeBoxView({ trade, me, onChange }: { trade: Trade; me?: string; onChange: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const yours = trade.sender === me;
  const open = trade.status === 'pending';

  async function answer(a: 'accept' | 'decline' | 'cancel') {
    setBusy(a);
    setError(null);
    try {
      await items_api.answer(trade.id, a);
      onChange();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(null);
    }
  }

  const who = (id: string, name: string | null) => (id === me ? 'You' : <Link to={`/players/${encodeURIComponent(id)}`}>{name ?? 'A player'}</Link>);
  return (
    <article className="trade" aria-label={`Trade with ${yours ? trade.recipient_name : trade.sender_name}`}>
      <header className="row">
        <strong>{who(trade.sender, trade.sender_name)} → {who(trade.recipient, trade.recipient_name)}</strong>
        <span className={`tag${open ? '' : ' tag--muted'}`}>{STATUS[trade.status]}</span>
        {open && !trade.available ? <span className="tag tag--warn">An item has moved: it can't be accepted</span> : null}
        <span className="muted">{new Date(trade.created_at).toLocaleString()}</span>
      </header>
      {trade.message ? <blockquote>{trade.message}</blockquote> : null}
      <div className="trade__sides">
        <Side title={trade.sender === me ? 'You give' : `${trade.sender_name ?? 'They'} gives`} items={trade.give} />
        <span className="trade__arrow" aria-hidden>⇄</span>
        <Side title={trade.recipient === me ? 'You give' : `${trade.recipient_name ?? 'They'} gives`} items={trade.take} />
      </div>
      {open ? (
        <div className="trade__actions">
          {yours ? (
            <Button tone="grey" busy={busy === 'cancel'} onClick={() => answer('cancel')}>Cancel the offer</Button>
          ) : (
            <>
              <Button tone="green" busy={busy === 'accept'} disabled={!trade.available} onClick={() => answer('accept')}>Accept</Button>
              <Button tone="red" busy={busy === 'decline'} onClick={() => answer('decline')}>Decline</Button>
            </>
          )}
          <span className="muted">Open until {new Date(trade.expires_at).toLocaleDateString()}</span>
        </div>
      ) : null}
      {error ? <Alert>{describe(error)}</Alert> : null}
    </article>
  );
}

function Side({ title, items }: { title: string; items: Trade['give'] }) {
  return (
    <section>
      <h3>{title}</h3>
      {items.length ? (
        <ul className="item-grid">{items.map((i) => <ItemCard key={i.id} item={i} to={`/item/${i.id}`} />)}</ul>
      ) : (
        <p className="muted">Nothing</p>
      )}
    </section>
  );
}
