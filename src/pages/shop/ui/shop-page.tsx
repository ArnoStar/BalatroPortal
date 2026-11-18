import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Link, useSearchParams } from 'react-router';
import {
  BoosterArt, booster_name, edition_name, ItemArt, item_name, kind_name, odds_label, rarity_name, size_name, tier_name, upgrades_label,
} from '@/entities/item';
import { describe, items_api, type Booster, type CoinMove, type ItemKind, type Odds, type Pack, type Tier } from '@/shared/api';
import { use_async } from '@/shared/lib';
import { Alert, Button, Coins, EmptyState, Icon, LinkButton, Modal, PageHeader, Panel, Segmented, Spinner } from '@/shared/ui';
import { fmt_datetime, fmt_number, N_, t, tp } from '@/shared/i18n';

const KINDS: ItemKind[] = ['joker', 'tarot', 'planet', 'spectral', 'card'];
const TIERS: Tier[] = ['standard', 'boosted', 'premium'];
const TIER_LINES: Record<Tier, string> = {
  standard: N_('The game’s own chances'),
  boosted: N_('Rarer cards, more editions'),
  premium: N_('Never common: the rarest cards and editions'),
};
// the odds' words (the item service's keys)
const WORDS: Record<string, string> = {
  common: N_('common'), uncommon: N_('uncommon'), rare: N_('rare'), legendary: N_('legendary'), base: N_('base'),
  foil: N_('foil'), holographic: N_('holographic'), polychrome: N_('polychrome'), negative: N_('negative'),
};
const word = (k: string) => (WORDS[k] ? t(WORDS[k]) : k);
// where coins come from and go
const REASONS: Record<string, string> = {
  weekly: N_('This week’s run'), weekly_win: N_('This week’s win'), first_deck_win: N_('A first win with a deck'),
  first_stake_win: N_('A first win at a stake'), booster: N_('A booster'), market_buy: N_('Bought on the market'),
  market_sale: N_('Sold on the market'), tag_refund: N_('A tag, given back'), gift: N_('A gift from the developers'),
};
const RULES: Record<string, string> = {
  weekly: N_('Each week (from Monday, UTC): the first counted run that ends at ante 3 or later, or wins'),
  weekly_win: N_('Each week: the first counted win'),
  first_deck_win: N_('The first counted win with each deck'),
  first_stake_win: N_('The first counted win at each stake from Red to Black (Gold: 1,000 coins)'),
};

/** with reduced motion, timed reveals don't wait */
const still = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** a pack's cards, as big as the window lets all of them, their words and the button be seen at once (as the
 *  game shows a pack: one row, nothing to scroll) */
function pack_scale(cards: number): number {
  if (typeof window === 'undefined') return 1.6;
  const width = Math.min(1180, window.innerWidth - 32) - 48;
  const per_card = width / Math.min(cards, window.innerWidth < 640 ? 2 : cards) - 20;
  const by_width = (per_card - 24) / 71;
  const by_height = (window.innerHeight - 400) / 95;
  return Math.max(0.8, Math.min(2.2, by_width, by_height));
}

function usePackScale(cards: number): number {
  const [scale, setScale] = useState(() => pack_scale(cards));
  useEffect(() => {
    const resize = () => setScale(pack_scale(cards));
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [cards]);
  return scale;
}

/** /shop: the boosters coins buy, the packs waiting to be opened, and where coins come from */
export function ShopPage() {
  const me = use_async(() => items_api.me(), []);
  const boosters = use_async(() => items_api.boosters(), []);
  const packs = use_async(() => items_api.packs('open'), []);
  const [params, setParams] = useSearchParams();
  const [kind, setKind] = useState<ItemKind>((params.get('kind') as ItemKind) || 'joker');
  const [buying, setBuying] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [opening, setOpening] = useState<{ pack: Pack; fresh: boolean } | null>(null);

  // a pack in the address (?pack=): opened again after a reload
  const asked = params.get('pack');
  useEffect(() => {
    if (!asked || opening?.pack.id === asked) return;
    let live = true;
    items_api.pack(asked).then((p) => live && setOpening({ pack: p, fresh: false }), (e: unknown) => live && setError(e));
    return () => {
      live = false;
    };
  }, [asked, opening?.pack.id]);

  function show(pack: Pack | null, fresh = false) {
    setOpening(pack ? { pack, fresh } : null);
    const next = new URLSearchParams(params);
    if (pack) next.set('pack', pack.id);
    else next.delete('pack');
    setParams(next, { replace: true });
  }

  async function buy(b: Booster) {
    setBuying(b.id);
    setError(null);
    try {
      const pack = await items_api.buy_booster(b.id);
      me.reload();
      packs.reload();
      show(pack, true);
    } catch (e) {
      setError(e);
    } finally {
      setBuying(null);
    }
  }

  const of_kind = useMemo(() => (boosters.data ?? []).filter((b) => b.kind === kind), [boosters.data, kind]);
  const coins = me.data?.coins ?? 0;
  return (
    <div className="stack">
      <PageHeader
        eyebrow={t('Items')}
        icon="gift"
        title={t('Shop')}
        lead={t('Your runs earn coins; coins buy boosters. Open one, and choose the cards you keep: they become your items.')}
        actions={
          <>
            {me.data ? <Coins value={coins} size="lg" className="coins--badge" /> : null}
            <LinkButton to="/market" tone="orange" icon={<Icon name="scale" />} viewTransition>
              {t('Market')}
            </LinkButton>
            <LinkButton to="/inventory" tone="grey" icon={<Icon name="cards" />} viewTransition>
              {t('Your items')}
            </LinkButton>
          </>
        }
      />
      {me.error ? <Alert>{describe(me.error)}</Alert> : null}
      {error ? <Alert>{describe(error)}</Alert> : null}
      {packs.data?.length ? <Waiting packs={packs.data} onOpen={(p) => show(p)} /> : null}
      <Panel
        title={t('Boosters')}
        icon="sparkles"
        actions={
          <Segmented
            label={t('Kind of card')}
            value={kind}
            onChange={(k) => {
              setKind(k);
              const next = new URLSearchParams(params);
              next.set('kind', k);
              setParams(next, { replace: true });
            }}
            options={KINDS.map((k) => [k, kind_name(k, true)] as const)}
          />
        }
      >
        {boosters.loading && !boosters.data ? <Spinner /> : null}
        {boosters.error ? <Alert>{describe(boosters.error)}</Alert> : null}
        <div className="tiers">
          {TIERS.map((tier) => {
            const row = of_kind.filter((b) => b.tier === tier);
            if (!row.length) return null;
            return (
              <section key={tier} className={`tier tier--${tier}`} aria-labelledby={`tier-${tier}`}>
                <header className="tier__head">
                  <h3 id={`tier-${tier}`}>{tier_name(tier)}</h3>
                  <p className="muted">{t(TIER_LINES[tier])}</p>
                  <Chances booster={row[0]} />
                </header>
                <ul className="boosters">
                  {row.map((b, n) => (
                    <li key={b.id} className={`booster booster--${b.tier}`} style={{ '--i': n } as CSSProperties}>
                      <BoosterArt booster={b} scale={1.75} />
                      <strong>{size_name(b.size)}</strong>
                      <small className="muted">{t('Choose {picks} of {choices}', { picks: b.picks, choices: b.choices })}</small>
                      <Button
                        size="sm"
                        tone={b.tier === 'premium' ? 'orange' : b.tier === 'boosted' ? 'blue' : 'grey'}
                        busy={buying === b.id}
                        disabled={!me.data || coins < b.price || buying !== null}
                        onClick={() => buy(b)}
                        aria-label={t('Buy {booster} for {n} coins', { booster: booster_name(b), n: fmt_number(b.price) })}
                      >
                        <Coins value={b.price} size="sm" />
                      </Button>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      </Panel>
      <div className="grid-2">
        <HowToEarn />
        <CoinHistory key={me.data?.coins} />
      </div>
      {opening ? (
        <PackOpening
          pack={opening.pack}
          fresh={opening.fresh}
          onClose={() => show(null)}
          onChosen={() => {
            packs.reload();
            me.reload();
          }}
        />
      ) : null}
    </div>
  );
}

/** a booster's chances: its rarities and editions */
function Chances({ booster }: { booster: Booster }) {
  const pct = (v: number) => `${fmt_number(v, v < 1 ? 2 : 1)}%`;
  return (
    <dl className="chances">
      {[...Object.entries(booster.rarities), ...Object.entries(booster.editions).filter(([k]) => k !== 'base')].map(([k, v]) => (
        <div key={k} className={`chances__item chances__item--${k}`}>
          <dt>{word(k)}</dt>
          <dd>{pct(v)}</dd>
        </div>
      ))}
    </dl>
  );
}

/** packs bought and not chosen from yet */
function Waiting({ packs, onOpen }: { packs: Pack[]; onOpen: (p: Pack) => void }) {
  return (
    <Panel title={tp(packs.length, '# pack to open', '# packs to open')} icon="gift" tone="glow">
      <ul className="waiting">
        {packs.map((p) => (
          <li key={p.id}>
            <button type="button" className="waiting__pack" onClick={() => onOpen(p)}>
              <BoosterArt booster={p.booster} scale={1.1} />
              <span>
                <strong>{booster_name(p.booster)}</strong>
                <small className="muted">{t('Choose {picks} of {choices}', { picks: p.picks, choices: p.choices.length })}</small>
              </span>
              <Icon name="arrow-right" />
            </button>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

/**
 * A pack: the booster is torn open (a fresh one), its cards are dealt face down and turned over one by one, and
 * the player chooses; then the cards chosen are theirs (links to the items).
 */
function PackOpening({ pack: first, fresh, onClose, onChosen }: {
  pack: Pack; fresh: boolean; onClose: () => void; onChosen: () => void;
}) {
  const [pack, setPack] = useState(first);
  const [torn, setTorn] = useState(!fresh);
  const [picked, setPicked] = useState<number[]>(first.chosen);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const opened = pack.status === 'opened';
  const scale = usePackScale(pack.choices.length);

  useEffect(() => {
    if (torn) return;
    const id = setTimeout(() => setTorn(true), still() ? 0 : 1100);
    return () => clearTimeout(id);
  }, [torn]);

  function toggle(i: number) {
    if (opened) return;
    setPicked((p) => (p.includes(i) ? p.filter((x) => x !== i) : pack.picks === 1 ? [i] : [...p, i].slice(-pack.picks)));
  }

  async function take() {
    setBusy(true);
    setError(null);
    try {
      setPack(await items_api.choose(pack.id, picked));
      onChosen();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }

  const item_of = (i: number) => {
    const n = pack.chosen.indexOf(i);
    return n >= 0 ? pack.items[n] : undefined;
  };
  return (
    <Modal title={booster_name(pack.booster)} onClose={onClose} className="modal--pack">
      {!torn ? (
        <div className={`pack-tear pack-tear--${pack.booster.tier}`} aria-live="polite">
          <BoosterArt booster={pack.booster} scale={2.6} />
          <span className="visually-hidden">{t('Opening the pack')}</span>
        </div>
      ) : (
        <div className="pack-open">
          <p className="pack-open__say" aria-live="polite">
            {opened
              ? tp(pack.chosen.length, 'This card is yours now.', 'These cards are yours now.')
              : t('Choose {picks} of these {choices} cards: the others are gone once you take them.', { picks: pack.picks, choices: pack.choices.length })}
          </p>
          <ul className={`pack-cards pack-cards--${pack.choices.length}`} style={{ '--card-w': `${Math.round(71 * scale + 28)}px` } as CSSProperties}>
            {pack.choices.map((c, n) => {
              const on = picked.includes(c.index);
              const item = item_of(c.index);
              const front = (
                <>
                  <ItemArt item={c} scale={scale} />
                  <strong>{item_name(c)}</strong>
                  {upgrades_label(c) ? <small className="pack-card__upgrades">{upgrades_label(c)}</small> : null}
                  <span className="item-card__meta">
                    <span className={`rarity rarity--${c.rarity}`}>{rarity_name(c.rarity)}</span>
                    {c.edition !== 'base' ? <span className={`edition edition--${c.edition}`}>{edition_name(c.edition)}</span> : null}
                  </span>
                  <small className="muted">
                    {odds_label(c.odds)} · {tp(c.minted, '# made', '# made')}
                  </small>
                </>
              );
              const cls = ['flip-card', 'pack-card', `flip-card--r${c.rarity}`, on && 'pack-card--on', opened && !on && 'pack-card--gone']
                .filter(Boolean).join(' ');
              return (
                <li key={c.index} className={cls} style={{ '--i': fresh ? n : 0 } as CSSProperties}>
                  <div className={`flip-card__inner${fresh ? '' : ' flip-card__inner--up'}`}>
                    <div className="flip-card__back" aria-hidden>
                      <Icon name="sparkle" />
                    </div>
                    {item ? (
                      <Link className="flip-card__front" to={`/item/${item.id}`} viewTransition>
                        {front}
                      </Link>
                    ) : (
                      <button type="button" className="flip-card__front" aria-pressed={on} disabled={opened} onClick={() => toggle(c.index)}>
                        {front}
                        {on ? (
                          <span className="pack-card__check" aria-hidden>
                            <Icon name="check" />
                          </span>
                        ) : null}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          {error ? <Alert>{describe(error)}</Alert> : null}
          <div className="row row--center pack-open__actions">
            {opened ? (
              <>
                <LinkButton to="/inventory" icon={<Icon name="cards" />} viewTransition>
                  {t('Your items')}
                </LinkButton>
                <Button tone="grey" onClick={onClose}>
                  {t('Close')}
                </Button>
              </>
            ) : (
              <Button size="lg" tone="orange" busy={busy} disabled={picked.length !== pack.picks} onClick={take} icon={<Icon name="check" />}>
                {tp(pack.picks, 'Take this card', 'Take these # cards')}
              </Button>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

function HowToEarn() {
  const odds = use_async(() => items_api.odds(), []);
  return (
    <Panel title={t('How coins are earned')} icon="coins">
      <p className="muted">
        {t('Only counted runs (not seeded, no challenge) earn coins, and each of these once: nothing can be farmed, so even a common card is worth something.')}
      </p>
      {odds.data ? <Rules odds={odds.data} /> : odds.error ? <Alert>{describe(odds.error)}</Alert> : <Spinner />}
    </Panel>
  );
}

function Rules({ odds }: { odds: Odds }) {
  return (
    <>
      <ul className="rules">
        {odds.rules.map((r) => (
          <li key={r.source}>
            <Icon name="gift" />
            <span>
              {RULES[r.source] ? t(RULES[r.source]) : r.description} <Coins value={r.coins} size="sm" />
            </span>
          </li>
        ))}
      </ul>
      <p className="muted">
        {t('A card you choose (or buy, or win) can’t change hands again for {hold}.', { hold: tp(odds.trade_hold_days, '# day', '# days') })}
      </p>
    </>
  );
}

function CoinHistory() {
  const coins = use_async(() => items_api.coins(30), []);
  return (
    <Panel title={t('Your coins')} icon="history">
      {coins.loading && !coins.data ? <Spinner /> : null}
      {coins.error ? <Alert>{describe(coins.error)}</Alert> : null}
      {coins.data && !coins.data.moves.length ? (
        <EmptyState icon="coins" title={t('No coins yet')}>
          {t('Finish a run at ante 3 or later this week, or win one.')}
        </EmptyState>
      ) : null}
      {coins.data?.moves.length ? (
        <ol className="coin-moves">
          {coins.data.moves.map((m, i) => (
            <Move key={i} m={m} />
          ))}
        </ol>
      ) : null}
    </Panel>
  );
}

function Move({ m }: { m: CoinMove }) {
  return (
    <li className={m.amount > 0 ? 'is-in' : 'is-out'}>
      <span>
        <strong>{REASONS[m.reason] ? t(REASONS[m.reason]) : m.reason}</strong>
        <time className="muted" dateTime={m.at}>
          {fmt_datetime(m.at)}
        </time>
      </span>
      <span className="coin-moves__amount">
        {m.amount > 0 ? '+' : '−'}
        <Coins value={Math.abs(m.amount)} size="sm" />
      </span>
    </li>
  );
}
