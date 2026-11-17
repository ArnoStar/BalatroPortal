import { useMemo, useState, type CSSProperties } from 'react';
import { Link } from 'react-router';
import { edition_name, ItemArt, ItemCard, item_label, item_name, rarity_name } from '@/entities/item';
import { describe, items_api, type Item, type Odds, type Week } from '@/shared/api';
import { CASINO_URL } from '@/shared/config';
import { time_left, use_async } from '@/shared/lib';
import { Alert, AnchorButton, Button, EmptyState, Icon, LinkButton, PageHeader, Panel, Segmented, Spinner } from '@/shared/ui';
import { current_lang, fmt_number, N_, t, tp } from '@/shared/i18n';

// the odds' words (the item service's keys), and its grants in the player's language
const ODDS_WORDS: Record<string, string> = {
  standard: N_('standard'), boosted: N_('boosted'), premium: N_('premium'), joker: N_('joker'), tag: N_('tag'),
  common: N_('common'), uncommon: N_('uncommon'), rare: N_('rare'), legendary: N_('legendary'), base: N_('base'),
  foil: N_('foil'), holographic: N_('holographic'), polychrome: N_('polychrome'), negative: N_('negative'),
};
const odds_word = (k: string) => (ODDS_WORDS[k] ? t(ODDS_WORDS[k]) : k);
const RULES: Record<string, string> = {
  weekly: N_('Each week (from Monday, UTC): the first counted run that ends at ante 3 or later, or wins'),
  weekly_win: N_('Each week: the first counted win'),
  first_deck_win: N_('The first counted win with each deck'),
  first_stake_win: N_('The first counted win at each stake from Red to Black (Gold: the premium table)'),
};
const rule_text = (source: string, english: string) => (RULES[source] ? t(RULES[source]) : english);

const date = (iso: string) => new Date(iso).toLocaleDateString(current_lang(), { weekday: 'long', month: 'short', day: 'numeric' });

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
            Your items <span className="tag">{m.items}</span>
          </>
        }
        lead={t('The game’s jokers and tags, found by playing and kept on your account. They change nothing in a run: show one on your title screen and profile, and trade them with other players.')}
        actions={
          <>
            <Button onClick={find} busy={finding} icon={<Icon name="sparkles" />}>
              {t('Look for new items')}
            </Button>
            <LinkButton to="/trades" tone="orange" icon={<Icon name="swap" />} viewTransition>
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
      <ThisWeek week={m.week} />
      {found !== null ? <Found items={found} onClose={() => setFound(null)} /> : null}
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
                options={[['all', `${t('All')} ${count('all')}`], ['joker', `${t('Jokers')} ${count('joker')}`], ['tag', `${t('Tags')} ${count('tag')}`]]}
              />
              <label className="select select--inline">
                <span>{t('Order')}</span>
                <select value={order} onChange={(e) => setOrder(e.target.value as Order)}>
                  <option value="newest">{t('Newest first')}</option>
                  <option value="rarest">{t('Rarest drop first')}</option>
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
                  <Link className="tag tag--warn" to={`/casino/${encodeURIComponent(i.staked)}`} viewTransition>
                    <Icon name="dice" /> {t('In the casino')}
                  </Link>
                ) : null}
              </ItemCard>
            ))}
          </ul>
        ) : items.data ? (
          <EmptyState icon="gift" title={items.data.length ? t('None of this kind') : t('No item yet')}>
            {items.data.length ? null : t('Finish a run at ante 3 or later this week, or win one.')}
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
    <ul className="week-cards" aria-label={t('This week')}>
      <li className={week.weekly_found ? 'is-done' : undefined}>
        <span className="week-cards__icon">
          <Icon name={week.weekly_found ? 'check' : 'target'} />
        </span>
        <span>
          <strong>{t('This week’s item')}</strong>
          <small>{week.weekly_found ? t('Found') : t('A run to ante 3')}</small>
        </span>
      </li>
      <li className={week.weekly_win_found ? 'is-done' : undefined}>
        <span className="week-cards__icon">
          <Icon name={week.weekly_win_found ? 'check' : 'trophy'} />
        </span>
        <span>
          <strong>{t('This week’s win')}</strong>
          <small>{week.weekly_win_found ? t('Found') : t('Win a run')}</small>
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
    </ul>
  );
}

/** the items just found, dealt face down and turned over one by one */
function Found({ items, onClose }: { items: Item[]; onClose: () => void }) {
  if (!items.length) {
    return (
      <Alert tone="info">
        {t('Nothing new for now: play on!')}{' '}
        <button type="button" className="link" onClick={onClose}>
          {t('Close')}
        </button>
      </Alert>
    );
  }
  return (
    <section className="found" aria-labelledby="found-title">
      <div className="found__rays" aria-hidden />
      <h2 className="found__title" id="found-title">
        {tp(items.length, 'You found an item!', 'You found # items!')}
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
                <strong>{item_name(item)}</strong>
                <span className="item-card__meta">
                  <span className={`rarity rarity--${item.rarity}`}>{rarity_name(item.rarity)}</span>
                  {item.edition !== 'base' ? <span className={`edition edition--${item.edition}`}>{edition_name(item.edition)}</span> : null}
                </span>
              </Link>
            </div>
          </li>
        ))}
      </ul>
      <Button tone="grey" onClick={onClose}>
        {t('Close')}
      </Button>
    </section>
  );
}

function HowToFind() {
  const odds = use_async(() => items_api.odds(), []);
  return (
    <Panel title={t('How items are found')} icon="info">
      <p className="muted">
        {t('Only counted runs (not seeded, no challenge) find items, and each of these once: nothing can be farmed, so even a common item is worth something.')}
      </p>
      {odds.data ? <OddsTables odds={odds.data} /> : odds.error ? <Alert>{describe(odds.error)}</Alert> : <Spinner />}
    </Panel>
  );
}

function OddsTables({ odds }: { odds: Odds }) {
  const pct = (v: number) => `${fmt_number(v, 2)}%`;
  const row = (label: string, pick: (table: Odds['tables'][number]) => Record<string, number>) => (
    <tr>
      <th scope="row">{label}</th>
      {odds.tables.map((table) => (
        <td key={table.name}>
          <ul className="odds">
            {Object.entries(pick(table)).map(([k, v]) => (
              <li key={k}>
                <span>{odds_word(k)}</span>
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
              {rule_text(r.source, r.description)} <em>({odds_word(r.table)})</em>
            </span>
          </li>
        ))}
      </ul>
      <div className="table-scroll">
        <table className="table table--odds">
          <thead>
            <tr>
              <td />
              {odds.tables.map((table) => (
                <th key={table.name} scope="col">
                  {odds_word(table.name)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {row(t('Kind'), (table) => table.kinds)}
            {row(t('Rarity'), (table) => table.rarities)}
            {row(t('Edition'), (table) => table.editions)}
          </tbody>
        </table>
      </div>
      <p className="muted">
        {t('An item that changes hands (or is found) can’t be traded again for {hold}. Offers stay open {open}.', {
          hold: tp(odds.trade_hold_days, '# day', '# days'),
          open: tp(odds.offer_days, '# day', '# days'),
        })}
      </p>
    </>
  );
}
