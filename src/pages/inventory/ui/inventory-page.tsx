import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { ItemCard, kind_name } from '@/entities/item';
import { describe, items_api, type Earned, type Item, type ItemKind, type Week } from '@/shared/api';
import { CASINO_URL } from '@/shared/config';
import { time_left, use_async } from '@/shared/lib';
import { Alert, AnchorButton, Button, Coins, EmptyState, Icon, LinkButton, PageHeader, Panel, Segmented, Spinner } from '@/shared/ui';
import { current_lang, N_, t, tp } from '@/shared/i18n';

const date = (iso: string) => new Date(iso).toLocaleDateString(current_lang(), { weekday: 'long', month: 'short', day: 'numeric' });

type Kind = 'all' | ItemKind;
type Order = 'newest' | 'rarest' | 'rarity';
const KINDS: ItemKind[] = ['joker', 'tarot', 'planet', 'spectral', 'card'];
const GRANTS: Record<string, string> = {
  weekly: N_('This week’s run'), weekly_win: N_('This week’s win'), first_deck_win: N_('A first win with a deck'),
  first_stake_win: N_('A first win at a stake'),
};

const ORDERS: Record<Order, (a: Item, b: Item) => number> = {
  newest: (a, b) => Date.parse(b.acquired_at) - Date.parse(a.acquired_at),
  rarest: (a, b) => b.odds - a.odds,
  rarity: (a, b) => b.rarity - a.rarity || b.odds - a.odds,
};

/** /inventory: your items, your coins and this week's, the packs waiting */
export function InventoryPage() {
  const me = use_async(() => items_api.me(), []);
  const items = use_async(() => items_api.mine(), []);
  const [earned, setEarned] = useState<Earned[] | null>(null);
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
      const r = await items_api.earn();
      setEarned(r.earned);
      me.reload();
    } catch (e) {
      setError(e);
    } finally {
      setFinding(false);
    }
  }

  if (me.loading && !me.data) return <Spinner />;
  if (me.error) {
    return (
      <Panel title={t('Your items')} icon="cards">
        <Alert>{describe(me.error)}</Alert>
      </Panel>
    );
  }
  const m = me.data!;
  const count = (k: Kind) => (items.data ?? []).filter((i) => k === 'all' || i.kind === k).length;
  return (
    <div className="stack">
      <PageHeader
        eyebrow={t('Items')}
        icon="cards"
        title={
          <>
            {t('Your items')} <span className="tag">{m.items}</span>
          </>
        }
        lead={t('The game’s cards, chosen from the boosters your coins buy and kept on your account. They change nothing in a run: show one on your title screen and profile, trade them, sell them on the market.')}
        actions={
          <>
            <Coins value={m.coins} size="lg" className="coins--badge" />
            <LinkButton to="/shop" icon={<Icon name="gift" />} viewTransition>
              {t('Shop')}
            </LinkButton>
            <LinkButton to="/market" tone="orange" icon={<Icon name="scale" />} viewTransition>
              {t('Market')}
            </LinkButton>
            <LinkButton to="/trades" tone="grey" icon={<Icon name="swap" />} viewTransition>
              {t('Trades')}
            </LinkButton>
            <AnchorButton href={`${CASINO_URL}/`} tone="grey" icon={<Icon name="dice" />}>
              {t('Casino')}
            </AnchorButton>
          </>
        }
      />
      {!m.can_trade ? <Alert tone="info">{t('Trading opens after your first win.')}</Alert> : null}
      {error ? <Alert>{describe(error)}</Alert> : null}
      {m.packs ? (
        <Alert tone="info">
          {tp(m.packs, 'You have # pack to open.', 'You have # packs to open.')}{' '}
          <Link to="/shop" viewTransition>
            {t('Open them in the shop')}
          </Link>
        </Alert>
      ) : null}
      <ThisWeek week={m.week} onLook={find} looking={finding} />
      {earned !== null ? <Earnings earned={earned} onClose={() => setEarned(null)} /> : null}
      <Panel
        title={t('Your collection')}
        icon="layers"
        actions={
          items.data?.length ? (
            <>
              <Segmented
                label={t('Show')}
                value={kind}
                onChange={setKind}
                options={[['all', `${t('All')} ${count('all')}`] as const, ...KINDS.filter((k) => count(k)).map((k) => [k, `${kind_name(k, true)} ${count(k)}`] as const)]}
              />
              <label className="select select--inline">
                <span>{t('Order')}</span>
                <select value={order} onChange={(e) => setOrder(e.target.value as Order)}>
                  <option value="newest">{t('Newest first')}</option>
                  <option value="rarest">{t('Most valuable first')}</option>
                  <option value="rarity">{t('By rarity')}</option>
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
                    <Icon name="star" /> {t('On your title screen')}
                  </span>
                ) : null}
                {i.staked ? (
                  <a className="tag tag--warn" href={`${CASINO_URL}/${encodeURIComponent(i.staked)}`}>
                    <Icon name="dice" /> {t('In the casino')}
                  </a>
                ) : null}
                {i.listed && i.price !== null ? (
                  <Link className="tag tag--warn" to="/market" viewTransition>
                    <Icon name="scale" /> {t('For sale')} · <Coins value={i.price} size="sm" />
                  </Link>
                ) : null}
              </ItemCard>
            ))}
          </ul>
        ) : items.data ? (
          <EmptyState icon="gift" title={items.data.length ? t('None of this kind') : t('No item yet')}>
            {items.data.length ? null : (
              <>
                {t('Your runs earn coins: buy a booster in the shop and choose your cards.')}{' '}
                <Link to="/shop" viewTransition>
                  {t('The shop')}
                </Link>
              </>
            )}
          </EmptyState>
        ) : null}
      </Panel>
    </div>
  );
}

function ThisWeek({ week, onLook, looking }: { week: Week; onLook: () => void; looking: boolean }) {
  const left = Date.parse(week.next_week_at) - Date.now();
  return (
    <ul className="week-cards" aria-label={t('This week')}>
      <li className={week.weekly_earned ? 'is-done' : undefined}>
        <span className="week-cards__icon">
          <Icon name={week.weekly_earned ? 'check' : 'target'} />
        </span>
        <span>
          <strong>
            {t('This week’s run')} <Coins value={week.weekly_coins} size="sm" />
          </strong>
          <small>{week.weekly_earned ? t('Earned') : t('A run to ante 3')}</small>
        </span>
      </li>
      <li className={week.weekly_win_earned ? 'is-done' : undefined}>
        <span className="week-cards__icon">
          <Icon name={week.weekly_win_earned ? 'check' : 'trophy'} />
        </span>
        <span>
          <strong>
            {t('This week’s win')} <Coins value={week.weekly_win_coins} size="sm" />
          </strong>
          <small>{week.weekly_win_earned ? t('Earned') : t('Win a run')}</small>
        </span>
      </li>
      <li>
        <span className="week-cards__icon">
          <Icon name="clock" />
        </span>
        <span>
          <strong>{t('New week in {time}', { time: time_left(left) })}</strong>
          <small>{date(week.next_week_at)}</small>
        </span>
      </li>
      <li>
        <Button size="sm" tone="grey" onClick={onLook} busy={looking} icon={<Icon name="refresh" />}>
          {t('Look for new coins')}
        </Button>
      </li>
    </ul>
  );
}

/** the coins just earned (the game tells them too, on its title screen) */
function Earnings({ earned, onClose }: { earned: Earned[]; onClose: () => void }) {
  const total = earned.reduce((n, e) => n + e.coins, 0);
  return (
    <Alert tone="info">
      {earned.length ? (
        <>
          {t('You earned')} <Coins value={total} size="sm" />: {earned.map((e) => (GRANTS[e.reason] ? t(GRANTS[e.reason]) : e.reason)).join(', ')}.{' '}
          <Link to="/shop" viewTransition>
            {t('Spend them in the shop')}
          </Link>
        </>
      ) : (
        t('Nothing new for now: play on!')
      )}{' '}
      <button type="button" className="link" onClick={onClose}>
        {t('Close')}
      </button>
    </Alert>
  );
}
