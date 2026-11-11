import { useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { ItemCard } from '@/entities/item';
import { describe, items_api, type Item, type ItemsPlayer } from '@/shared/api';
import { use_async } from '@/shared/lib';
import { Alert, Avatar, Button, EmptyState, Field, Icon, PageHeader, Panel, Spinner } from '@/shared/ui';

const MAX_SIDE = 10;

/** /trades/new?to=<player>&take=<item>: an offer to a player, your items for theirs */
export function NewTradePage() {
  const [params, setParams] = useSearchParams();
  const to = params.get('to');
  if (!to) return <PickPlayer onPick={(id) => setParams({ to: id })} />;
  return <Offer to={to} preset={params.getAll('take')} />;
}

function PickPlayer({ onPick }: { onPick: (id: string) => void }) {
  const [q, setQ] = useState('');
  const [found, setFound] = useState<ItemsPlayer[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  async function search(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      setFound((await items_api.find_players(q)).filter((p) => !p.you));
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="stack">
      <PageHeader eyebrow="Trades" icon="swap" title="Make an offer" lead="Who do you want to trade with? Find a player by name." />
      <Panel narrow>
        <form onSubmit={search} className="form form--inline">
          <Field label="The player's name" value={q} onChange={(e) => setQ(e.target.value)} required maxLength={40} autoComplete="off" />
          <Button type="submit" busy={busy} icon={<Icon name="search" />}>
            Search
          </Button>
        </form>
        {error ? <Alert>{describe(error)}</Alert> : null}
        {found?.length === 0 ? <EmptyState icon="users" title="No player by that name has items" /> : null}
        {found?.length ? (
          <ul className="players">
            {found.map((p) => (
              <li key={p.id}>
                <button type="button" className="players__pick" onClick={() => onPick(p.id)} disabled={!p.can_trade}>
                  <Avatar name={p.name} />
                  <span className="players__text">
                    <strong>{p.name ?? 'A player'}</strong>
                    <small>
                      {p.items} items{p.can_trade ? '' : ", can't trade yet"}
                    </small>
                  </span>
                  <Icon name="chevron-right" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </Panel>
    </div>
  );
}

function Offer({ to, preset }: { to: string; preset: string[] }) {
  const navigate = useNavigate();
  const data = use_async(async () => {
    const [player, theirs, mine] = await Promise.all([items_api.player(to), items_api.player_items(to), items_api.mine()]);
    return { player, theirs, mine };
  }, [to]);
  const [give, setGive] = useState<string[]>([]);
  const [take, setTake] = useState<string[]>(preset);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  if (data.loading && !data.data) return <Spinner />;
  if (data.error) {
    return (
      <Panel title="Make an offer" icon="swap">
        <Alert>{describe(data.error)}</Alert>
      </Panel>
    );
  }
  const { player, theirs, mine } = data.data!;
  const toggle = (list: string[], set: (v: string[]) => void, id: string) =>
    set(list.includes(id) ? list.filter((x) => x !== id) : list.length < MAX_SIDE ? [...list, id] : list);

  async function send(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await items_api.offer({ to, give, take, message });
      navigate('/trades?sent=1', { viewTransition: true });
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  const pickable = (items: Item[], list: string[], set: (v: string[]) => void) =>
    items.length ? (
      <ul className="item-grid item-grid--small">
        {items.map((i, n) => (
          <ItemCard key={i.id} item={i} index={n} selected={list.includes(i.id)} onSelect={i.tradable ? () => toggle(list, set, i.id) : undefined}>
            {i.tradable ? null : (
              <span className="muted">{i.staked ? 'Staked in the casino' : `Tradable from ${new Date(i.tradable_at).toLocaleDateString()}`}</span>
            )}
          </ItemCard>
        ))}
      </ul>
    ) : (
      <EmptyState icon="cards" title="No item" />
    );

  const name = player.name ?? 'a player';
  return (
    <form className="stack" onSubmit={send}>
      <PageHeader
        eyebrow="Trades"
        icon="swap"
        title={
          <>
            An offer to <span className="page-title__name">{name}</span>
          </>
        }
        lead={`Pick your items and theirs: up to ${MAX_SIDE} on each side, and one side may be empty.`}
      />
      {!player.can_trade ? <Alert tone="info">This player can't trade yet: trading opens after a first win.</Alert> : null}
      <div className="grid-2 offer">
        <Panel title={`You give (${give.length})`} icon="arrow-right">
          {pickable(mine, give, setGive)}
        </Panel>
        <Panel title={`You ask for (${take.length})`} icon="gift">
          {pickable(theirs, take, setTake)}
        </Panel>
      </div>
      <div className="offer-bar">
        <Avatar name={player.name} />
        <div className="offer-bar__field">
          <Field label="A message (optional)" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={280} placeholder={`Say something to ${name}`} />
        </div>
        <p className="offer-bar__sum" aria-live="polite">
          <strong>{give.length}</strong> for <strong>{take.length}</strong>
        </p>
        <Button type="submit" tone="orange" size="lg" busy={busy} disabled={!give.length && !take.length} icon={<Icon name="swap" />}>
          Send the offer
        </Button>
        {error ? <Alert>{describe(error)}</Alert> : null}
      </div>
    </form>
  );
}
