import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { ItemCard } from '@/entities/item';
import { describe, items_api, type Trade, type TradeBox } from '@/shared/api';
import { time_ago, use_async } from '@/shared/lib';
import { Alert, Avatar, Button, EmptyState, Icon, LinkButton, PageHeader, Segmented, Spinner } from '@/shared/ui';

const BOXES: [TradeBox, string][] = [['incoming', 'Offers to you'], ['outgoing', 'Your offers'], ['all', 'All']];
const STATUS: Record<Trade['status'], string> = {
  pending: 'Open', accepted: 'Accepted', declined: 'Declined', cancelled: 'Cancelled', expired: 'Expired',
};

/** /trades: offers made to you and yours */
export function TradesPage() {
  const [params] = useSearchParams();
  const [box, setBox] = useState<TradeBox>(params.get('sent') ? 'outgoing' : 'incoming');
  const me = use_async(() => items_api.me(), []);
  const trades = use_async(() => items_api.trades(box), [box]);
  return (
    <div className="stack">
      <PageHeader
        eyebrow="Items"
        icon="swap"
        title="Trades"
        lead="Offer some of your items for some of another player's. They accept (every item changes hands at once), decline, or let it expire. Both players need a first win, and an item that changes hands can't be traded again for a week."
        actions={
          <>
            <LinkButton to="/trades/new" tone="orange" icon={<Icon name="swap" />} viewTransition>
              Make an offer
            </LinkButton>
            <LinkButton to="/inventory" tone="grey" icon={<Icon name="cards" />} viewTransition>
              Your items
            </LinkButton>
          </>
        }
      />
      {params.get('sent') ? <Alert tone="success">Your offer is sent.</Alert> : null}
      {me.data && !me.data.can_trade ? <Alert tone="info">Trading opens after your first win (a counted run).</Alert> : null}
      <div>
        <Segmented label="Trades" value={box} onChange={setBox} options={BOXES} />
      </div>
      {trades.loading && !trades.data ? <Spinner /> : null}
      {trades.error ? <Alert>{describe(trades.error)}</Alert> : null}
      {trades.data?.length === 0 ? (
        <div className="panel">
          <EmptyState
            icon="swap"
            title="No trade here"
            action={
              <LinkButton to="/trades/new" tone="orange" icon={<Icon name="swap" />} viewTransition>
                Make an offer
              </LinkButton>
            }
          >
            Find a player whose items you like, from the leaderboards or by name.
          </EmptyState>
        </div>
      ) : null}
      <div className={`stack${trades.loading ? ' refreshing' : ''}`}>
        {trades.data?.map((t) => (
          <TradeView key={t.id} trade={t} me={me.data?.id} onChange={trades.reload} />
        ))}
      </div>
    </div>
  );
}

function TradeView({ trade, me, onChange }: { trade: Trade; me?: string; onChange: () => void }) {
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

  const who = (id: string, name: string | null) => (
    <span className="who">
      <Avatar name={id === me ? 'You' : name} seed={name} size="sm" />
      {id === me ? (
        'You'
      ) : (
        <Link to={`/players/${encodeURIComponent(id)}`} viewTransition>
          {name ?? 'A player'}
        </Link>
      )}
    </span>
  );
  return (
    <article className={`trade trade--${trade.status}`} aria-label={`Trade with ${yours ? trade.recipient_name : trade.sender_name}`}>
      <header className="trade__head">
        <span className="trade__people">
          {who(trade.sender, trade.sender_name)}
          <Icon name="arrow-right" className="trade__to" />
          {who(trade.recipient, trade.recipient_name)}
        </span>
        <span className={`status status--${open ? 'live' : trade.status === 'accepted' ? 'won' : 'lost'}`}>
          <Icon name={open ? 'dot' : trade.status === 'accepted' ? 'check-circle' : 'x-circle'} />
          {STATUS[trade.status]}
        </span>
        {open && !trade.available ? (
          <span className="tag tag--warn">
            <Icon name="alert" /> An item has moved: it can't be accepted
          </span>
        ) : null}
        <time className="muted trade__when" dateTime={trade.created_at} title={new Date(trade.created_at).toLocaleString()}>
          {time_ago(trade.created_at)}
        </time>
      </header>
      {trade.message ? (
        <blockquote className="trade__message">
          <Icon name="note" />
          {trade.message}
        </blockquote>
      ) : null}
      <div className="trade__sides">
        <Side title={trade.sender === me ? 'You give' : `${trade.sender_name ?? 'They'} gives`} items={trade.give} />
        <span className="trade__swap" aria-hidden>
          <Icon name="swap" />
        </span>
        <Side title={trade.recipient === me ? 'You give' : `${trade.recipient_name ?? 'They'} gives`} items={trade.take} />
      </div>
      {open ? (
        <div className="trade__actions">
          {yours ? (
            <Button tone="grey" busy={busy === 'cancel'} onClick={() => answer('cancel')} icon={<Icon name="close" />}>
              Cancel the offer
            </Button>
          ) : (
            <>
              <Button tone="green" busy={busy === 'accept'} disabled={!trade.available} onClick={() => answer('accept')} icon={<Icon name="check" />}>
                Accept
              </Button>
              <Button tone="red" busy={busy === 'decline'} onClick={() => answer('decline')} icon={<Icon name="close" />}>
                Decline
              </Button>
            </>
          )}
          <span className="muted">
            <Icon name="clock" /> Open until {new Date(trade.expires_at).toLocaleDateString()}
          </span>
        </div>
      ) : null}
      {error ? <Alert>{describe(error)}</Alert> : null}
    </article>
  );
}

function Side({ title, items }: { title: string; items: Trade['give'] }) {
  return (
    <section className="trade__side">
      <h3>{title}</h3>
      {items.length ? (
        <ul className="item-grid item-grid--small">
          {items.map((i, n) => (
            <ItemCard key={i.id} item={i} to={`/item/${i.id}`} index={n} />
          ))}
        </ul>
      ) : (
        <p className="muted">Nothing</p>
      )}
    </section>
  );
}
