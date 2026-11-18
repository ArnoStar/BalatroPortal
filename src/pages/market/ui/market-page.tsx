import { useEffect, useState, type CSSProperties } from 'react';
import { Link } from 'react-router';
import { useSession } from '@/entities/session';
import { edition_name, ItemArt, ItemCard, item_name, kind_name, rarity_name, upgrades_label } from '@/entities/item';
import { SellForm } from '@/features/sell-item';
import {
  describe, items_api, type Edition, type Item, type ItemKind, type Listing, type ListingBox, type ListingSort, type MarketQuery,
} from '@/shared/api';
import { use_async } from '@/shared/lib';
import { Alert, Avatar, Button, Coins, EmptyState, Icon, LinkButton, Modal, PageHeader, Panel, Segmented, Spinner } from '@/shared/ui';
import { fmt_ago, fmt_number, t, tx } from '@/shared/i18n';

type Tab = 'browse' | 'selling' | 'history';
const PAGE = 48;
const KINDS: ItemKind[] = ['joker', 'tarot', 'planet', 'spectral', 'card'];
const EDITIONS: Edition[] = ['base', 'foil', 'holographic', 'polychrome', 'negative'];

/** /market: items for sale by other players, for coins; your items for sale; what you sold and bought */
export function MarketPage() {
  const { account } = useSession();
  const me = use_async(() => items_api.me(), []);
  const [tab, setTab] = useState<Tab>('browse');
  const [selling, setSelling] = useState(false);
  const [tick, setTick] = useState(0);
  const changed = () => {
    setTick((n) => n + 1);
    me.reload();
  };
  const my_id = me.data?.id ?? account?.id;
  return (
    <div className="stack">
      <PageHeader
        eyebrow={t('Items')}
        icon="scale"
        title={t('Market')}
        lead={t('Players sell their items here, for the coins they ask. Buy one and it is yours at once; sell yours to another player.')}
        actions={
          <>
            {me.data ? <Coins value={me.data.coins} size="lg" className="coins--badge" /> : null}
            <Button onClick={() => setSelling(true)} disabled={!me.data?.can_trade} icon={<Icon name="scale" />}>
              {t('Sell an item')}
            </Button>
            <LinkButton to="/shop" tone="grey" icon={<Icon name="gift" />} viewTransition>
              {t('Shop')}
            </LinkButton>
          </>
        }
      />
      {me.data && !me.data.can_trade ? <Alert tone="info">{t('The market opens after your first win.')}</Alert> : null}
      <Segmented
        label={t('Show')}
        value={tab}
        onChange={setTab}
        options={[['browse', t('For sale')], ['selling', t('Your items for sale')], ['history', t('Sold and bought')]]}
      />
      {tab === 'browse' ? <Browse key={tick} me={my_id} coins={me.data?.coins ?? 0} canBuy={!!me.data?.can_trade} onChange={changed} /> : null}
      {tab === 'selling' ? <Mine key={tick} box="selling" onChange={changed} /> : null}
      {tab === 'history' ? <Mine key={tick} box="all" onChange={changed} /> : null}
      {selling ? (
        <SellDialog
          onClose={() => setSelling(false)}
          onSold={() => {
            setSelling(false);
            setTab('selling');
            changed();
          }}
        />
      ) : null}
    </div>
  );
}

function Browse({ me, coins, canBuy, onChange }: { me?: string; coins: number; canBuy: boolean; onChange: () => void }) {
  const [query, setQuery] = useState<MarketQuery>({ sort: 'newest' });
  const [text, setText] = useState('');
  const [list, setList] = useState<Listing[] | null>(null);
  const [more, setMore] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [buying, setBuying] = useState<Listing | null>(null);

  // the search waits for the player to stop typing
  useEffect(() => {
    const id = setTimeout(() => setQuery((q) => (q.q === text.trim() ? q : { ...q, q: text.trim() || undefined })), 300);
    return () => clearTimeout(id);
  }, [text]);

  useEffect(() => {
    let live = true;
    setError(null);
    items_api.market({ ...query, limit: PAGE }).then(
      (l) => {
        if (!live) return;
        setList(l);
        setMore(l.length === PAGE);
      },
      (e: unknown) => live && setError(e),
    );
    return () => {
      live = false;
    };
  }, [query]);

  async function load_more() {
    try {
      const next = await items_api.market({ ...query, limit: PAGE, offset: list?.length ?? 0 });
      setList((l) => [...(l ?? []), ...next]);
      setMore(next.length === PAGE);
    } catch (e) {
      setError(e);
    }
  }

  const set = (patch: Partial<MarketQuery>) => setQuery((q) => ({ ...q, ...patch }));
  return (
    <Panel title={t('For sale')} icon="scale">
      <form className="market-filters" role="search" onSubmit={(e) => e.preventDefault()}>
        <label className="field field--search">
          <span className="visually-hidden">{t('Search by name')}</span>
          <Icon name="search" />
          <input type="search" placeholder={t('Search by name (the game’s English names)')} value={text} onChange={(e) => setText(e.target.value)} />
        </label>
        <label className="select select--inline">
          <span>{t('Kind')}</span>
          <select value={query.kind ?? ''} onChange={(e) => set({ kind: (e.target.value || undefined) as ItemKind | undefined })}>
            <option value="">{t('All')}</option>
            {KINDS.map((k) => (
              <option key={k} value={k}>
                {kind_name(k, true)}
              </option>
            ))}
          </select>
        </label>
        <label className="select select--inline">
          <span>{t('Rarity')}</span>
          <select value={query.rarity ?? ''} onChange={(e) => set({ rarity: e.target.value ? Number(e.target.value) : undefined })}>
            <option value="">{t('All')}</option>
            {[1, 2, 3, 4].map((r) => (
              <option key={r} value={r}>
                {rarity_name(r)}
              </option>
            ))}
          </select>
        </label>
        <label className="select select--inline">
          <span>{t('Edition')}</span>
          <select value={query.edition ?? ''} onChange={(e) => set({ edition: (e.target.value || undefined) as Edition | undefined })}>
            <option value="">{t('All')}</option>
            {EDITIONS.map((ed) => (
              <option key={ed} value={ed}>
                {edition_name(ed)}
              </option>
            ))}
          </select>
        </label>
        <label className="select select--inline">
          <span>{t('Order')}</span>
          <select value={query.sort} onChange={(e) => set({ sort: e.target.value as ListingSort })}>
            <option value="newest">{t('Newest first')}</option>
            <option value="price">{t('Cheapest first')}</option>
            <option value="-price">{t('Dearest first')}</option>
          </select>
        </label>
      </form>
      {error ? <Alert>{describe(error)}</Alert> : null}
      {!list && !error ? <Spinner /> : null}
      {list && !list.length ? (
        <EmptyState icon="scale" title={t('Nothing for sale like this')}>
          {t('Try another search, or sell one of yours.')}
        </EmptyState>
      ) : null}
      {list?.length ? (
        <ul className="item-grid">
          {list.map((l, n) =>
            l.item ? (
              <ItemCard key={l.id} item={l.item} to={`/item/${l.item.id}`} index={n}>
                <div className="listing-foot">
                  <Coins value={l.price} />
                  {l.seller === me ? (
                    <span className="tag">{t('Yours')}</span>
                  ) : (
                    <Button size="sm" tone="green" disabled={!canBuy || coins < l.price} onClick={() => setBuying(l)}>
                      {t('Buy')}
                    </Button>
                  )}
                </div>
                <span className="muted listing-seller">
                  <Avatar name={l.seller_name} player={l.seller} size="sm" /> {l.seller_name ?? t('A player')} · {fmt_ago(l.created_at)}
                </span>
              </ItemCard>
            ) : null,
          )}
        </ul>
      ) : null}
      {more ? (
        <div className="row row--center">
          <Button tone="grey" onClick={load_more}>
            {t('More')}
          </Button>
        </div>
      ) : null}
      {buying ? (
        <BuyDialog
          listing={buying}
          coins={coins}
          onClose={() => setBuying(null)}
          onBought={() => {
            setBuying(null);
            onChange();
          }}
        />
      ) : null}
    </Panel>
  );
}

function BuyDialog({ listing, coins, onClose, onBought }: { listing: Listing; coins: number; onClose: () => void; onBought: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [done, setDone] = useState<Listing | null>(null);
  const item = listing.item!;
  async function buy() {
    setBusy(true);
    setError(null);
    try {
      setDone(await items_api.buy(listing.id));
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title={done ? t('It is yours') : t('Buy it?')} onClose={done ? onBought : onClose}>
      <div className="buy-dialog">
        <ItemArt item={item} scale={2.2} seed={item.id} />
        <div className="stack stack--tight">
          <strong>{item_name(item)}</strong>
          {upgrades_label(item) ? <span className="muted">{upgrades_label(item)}</span> : null}
          <span className="item-card__meta">
            <span className={`rarity rarity--${item.rarity}`}>{rarity_name(item.rarity)}</span>
            {item.edition !== 'base' ? <span className={`edition edition--${item.edition}`}>{edition_name(item.edition)}</span> : null}
          </span>
          <p>
            {tx('{price} to {seller}', { price: <Coins value={listing.price} />, seller: <strong>{listing.seller_name ?? t('a player')}</strong> })}
          </p>
          <p className="muted">
            {done
              ? t('Its trade hold starts now: it can change hands again in a week.')
              : t('You have {n} coins. Once bought, it can’t change hands again for a week (its trade hold).', { n: fmt_number(coins) })}
          </p>
        </div>
      </div>
      {error ? <Alert>{describe(error)}</Alert> : null}
      <div className="row row--end">
        {done ? (
          <LinkButton to={`/item/${item.id}`} icon={<Icon name="cards" />} viewTransition>
            {t('See it')}
          </LinkButton>
        ) : (
          <>
            <Button tone="grey" onClick={onClose}>
              {t('Cancel')}
            </Button>
            <Button tone="green" busy={busy} onClick={buy} icon={<Icon name="check" />}>
              {t('Buy it for {n} coins', { n: fmt_number(listing.price) })}
            </Button>
          </>
        )}
      </div>
    </Modal>
  );
}

/** your items for sale (``selling``: take them off), or everything you sold, bought or took off (``all``) */
function Mine({ box, onChange }: { box: ListingBox; onChange: () => void }) {
  const list = use_async(() => items_api.my_listings(box), [box]);
  const me = use_async(() => items_api.me(), []);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);

  async function take_off(l: Listing) {
    setBusy(l.id);
    setError(null);
    try {
      await items_api.take_off(l.id);
      onChange();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(null);
    }
  }

  if (list.loading && !list.data) return <Spinner />;
  if (list.error) return <Alert>{describe(list.error)}</Alert>;
  const rows = list.data ?? [];
  if (box === 'selling') {
    return (
      <Panel title={t('Your items for sale')} icon="scale">
        {error ? <Alert>{describe(error)}</Alert> : null}
        {rows.length ? (
          <ul className="item-grid">
            {rows.map((l, n) =>
              l.item ? (
                <ItemCard key={l.id} item={l.item} to={`/item/${l.item.id}`} index={n}>
                  <div className="listing-foot">
                    <Coins value={l.price} />
                    <Button size="sm" tone="grey" busy={busy === l.id} onClick={() => take_off(l)}>
                      {t('Take it off')}
                    </Button>
                  </div>
                </ItemCard>
              ) : null,
            )}
          </ul>
        ) : (
          <EmptyState icon="scale" title={t('Nothing for sale')}>
            {t('Sell an item from here, or from its page.')}
          </EmptyState>
        )}
      </Panel>
    );
  }
  const my_id = me.data?.id;
  return (
    <Panel title={t('Sold and bought')} icon="history">
      {rows.length ? (
        <ol className="market-history">
          {rows.map((l, n) => {
            const sold = l.status === 'sold' && l.seller === my_id;
            const bought = l.status === 'sold' && l.buyer === my_id;
            return (
              <li key={l.id} style={{ '--i': n } as CSSProperties}>
                {l.item ? (
                  <Link to={`/item/${l.item.id}`} className="market-history__art" viewTransition>
                    <ItemArt item={l.item} scale={0.7} seed={l.item.id} />
                  </Link>
                ) : null}
                <span className="market-history__what">
                  <strong>{l.item ? item_name(l.item) : t('An item')}</strong>
                  <small className="muted">
                    {sold
                      ? t('Sold to {name}', { name: l.buyer_name ?? t('a player') })
                      : bought
                        ? t('Bought from {name}', { name: l.seller_name ?? t('a player') })
                        : l.status === 'open'
                          ? t('For sale')
                          : t('Taken off the market')}{' '}
                    · {fmt_ago(l.updated_at)}
                  </small>
                </span>
                <span className={`market-history__price${sold ? ' is-in' : bought ? ' is-out' : ''}`}>
                  {sold ? '+' : bought ? '−' : ''}
                  <Coins value={l.price} size="sm" />
                </span>
              </li>
            );
          })}
        </ol>
      ) : (
        <EmptyState icon="history" title={t('Nothing yet')}>
          {t('What you sell and buy on the market shows here.')}
        </EmptyState>
      )}
    </Panel>
  );
}

/** choose one of your items (out of its trade hold), then its price */
function SellDialog({ onClose, onSold }: { onClose: () => void; onSold: () => void }) {
  const mine = use_async(() => items_api.mine(), []);
  const [item, setItem] = useState<Item | null>(null);
  const ready = (mine.data ?? []).filter((i) => i.tradable);
  return (
    <Modal title={item ? t('Sell {name}', { name: item_name(item) }) : t('Sell an item')} onClose={onClose} wide>
      {item ? (
        <div className="sell-dialog">
          <div className="sell-dialog__item">
            <ItemArt item={item} scale={2.2} seed={item.id} />
            <Button size="sm" tone="ghost" onClick={() => setItem(null)} icon={<Icon name="arrow-left" />}>
              {t('Another item')}
            </Button>
          </div>
          <SellForm item={item} onSold={onSold} />
        </div>
      ) : mine.loading && !mine.data ? (
        <Spinner />
      ) : mine.error ? (
        <Alert>{describe(mine.error)}</Alert>
      ) : ready.length ? (
        <ul className="item-grid item-grid--pick">
          {ready.map((i, n) => (
            <ItemCard key={i.id} item={i} index={n} onSelect={() => setItem(i)} />
          ))}
        </ul>
      ) : (
        <EmptyState icon="cards" title={t('No item to sell')}>
          {t('Items out of their trade hold, not staked and not for sale already, can be sold.')}
        </EmptyState>
      )}
    </Modal>
  );
}
