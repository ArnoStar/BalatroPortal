import { useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { ItemCard } from '@/entities/item';
import { describe, items_api, type Item, type ItemsPlayer } from '@/shared/api';
import { use_async } from '@/shared/lib';
import { Alert, Button, Field, Panel, Spinner } from '@/shared/ui';

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
  async function search(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      setFound((await items_api.find_players(q)).filter((p) => !p.you));
    } catch (err) {
      setError(err);
    }
  }
  return (
    <Panel title="Make an offer" narrow>
      <form onSubmit={search} className="stack">
        <Field label="The player's name" value={q} onChange={(e) => setQ(e.target.value)} required maxLength={40} />
        <Button type="submit">Search</Button>
      </form>
      {error ? <Alert>{describe(error)}</Alert> : null}
      {found?.length === 0 ? <p className="muted">No player by that name has items.</p> : null}
      <ul className="plain-list">
        {found?.map((p) => (
          <li key={p.id}>
            <button type="button" className="link" onClick={() => onPick(p.id)} disabled={!p.can_trade}>
              {p.name ?? 'A player'}
            </button>{' '}
            <span className="muted">{p.items} items{p.can_trade ? '' : ', can\'t trade yet'}</span>
          </li>
        ))}
      </ul>
    </Panel>
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
      <Panel title="Make an offer">
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
      navigate('/trades?sent=1');
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  const pickable = (items: Item[], list: string[], set: (v: string[]) => void) => (
    items.length ? (
      <ul className="item-grid">
        {items.map((i) => (
          <ItemCard key={i.id} item={i} selected={list.includes(i.id)} onSelect={i.tradable ? () => toggle(list, set, i.id) : undefined}>
            {i.tradable ? null : (
              <span className="muted">{i.staked ? 'Staked in the casino' : `Tradable from ${new Date(i.tradable_at).toLocaleDateString()}`}</span>
            )}
          </ItemCard>
        ))}
      </ul>
    ) : <p className="muted">No item.</p>
  );

  return (
    <form className="stack" onSubmit={send}>
      <Panel title={`An offer to ${player.name ?? 'a player'}`}>
        {!player.can_trade ? <Alert tone="info">This player can't trade yet: trading opens after a first win.</Alert> : null}
        <p className="muted">Pick your items and theirs (up to {MAX_SIDE} on each side; one side may be empty).</p>
        <Field label="A message (optional)" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={280} />
        <div className="row">
          <Button type="submit" busy={busy} disabled={!give.length && !take.length}>
            Send the offer ({give.length} for {take.length})
          </Button>
        </div>
        {error ? <Alert>{describe(error)}</Alert> : null}
      </Panel>
      <Panel title={`You give (${give.length})`}>{pickable(mine, give, setGive)}</Panel>
      <Panel title={`You ask for (${take.length})`}>{pickable(theirs, take, setTake)}</Panel>
    </form>
  );
}
