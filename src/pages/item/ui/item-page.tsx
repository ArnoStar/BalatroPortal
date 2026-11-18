import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { useSession } from '@/entities/session';
import {
  Condition, edition_name, enhancement_name, ItemArt, item_name, kind_name, odds_label, rarity_name, seal_name, source_label,
  stake_label,
} from '@/entities/item';
import { SellForm } from '@/features/sell-item';
import { describe, items_api, type Item, type Transfer } from '@/shared/api';
import { CASINO_URL, GAME_URL } from '@/shared/config';
import { use_async } from '@/shared/lib';
import { Alert, Avatar, Button, Coins, Icon, LinkButton, Panel, Spinner, useTilt } from '@/shared/ui';
import { fmt_ago, fmt_datetime, fmt_number, t, tx } from '@/shared/i18n';

const when = (iso: string) => fmt_datetime(iso);

/** /item/:id: an item, where it came from, and who has had it */
export function ItemPage() {
  const { id = '' } = useParams();
  const { account } = useSession();
  const detail = use_async(() => items_api.item(id), [id]);
  const me = use_async(() => items_api.me().catch(() => null), []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  if (detail.loading && !detail.data) return <Spinner />;
  if (detail.error) {
    return (
      <Panel title={t('Item')} icon="cards">
        <Alert>{describe(detail.error)}</Alert>
      </Panel>
    );
  }
  const { item, history } = detail.data!;
  const mine = me.data?.id === item.owner || account?.id === item.owner;
  const shown = me.data?.showcase?.id === item.id;
  const gone = !!item.destroyed_at;

  async function act(run: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await run();
      detail.reload();
      me.reload();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }

  async function showcase(on: boolean) {
    setBusy(true);
    setError(null);
    try {
      await items_api.showcase(on ? item.id : null);
      me.reload();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack">
      <section className={`item-detail item-detail--r${item.rarity}`} aria-labelledby="item-title">
        <Stage item={item} />
        <div className="item-detail__info">
          <p className="eyebrow">
            <Icon name="cards" /> {kind_name(item.kind)} · {t('#{serial} of the {minted} made', { serial: item.serial, minted: item.minted })}
          </p>
          <h1 className="page-title" id="item-title">
            {item_name(item)}
          </h1>
          <p className="item-detail__chips">
            <span className={`rarity rarity--${item.rarity}`}>{rarity_name(item.rarity)}</span>
            {item.edition !== 'base' ? <span className={`edition edition--${item.edition}`}>{edition_name(item.edition)}</span> : null}
            {item.enhancement ? <span className="upgrade">{enhancement_name(item.enhancement)}</span> : null}
            {item.seal ? <span className={`upgrade upgrade--seal upgrade--${item.seal.toLowerCase()}`}>{seal_name(item.seal)}</span> : null}
            {item.stake ? <span className={`stake stake--${item.stake}`}>{t('Won at {stake}', { stake: stake_label(item.stake) })}</span> : null}
            {shown ? (
              <span className="tag tag--gold">
                <Icon name="star" /> {t('On your title screen')}
              </span>
            ) : null}
          </p>
          <dl className="specs">
            <div>
              <dt>{t('Condition')}</dt>
              <dd>
                <Condition condition={item.condition} grade={item.grade} wide />{' '}
                <span className="muted mono">{item.condition.toFixed(6)}</span>
              </dd>
            </div>
            <div>
              <dt>{t('Value')}</dt>
              <dd>
                <Coins value={item.value} size="sm" />{' '}
                <span className="muted">{t('({mint} in perfect condition)', { mint: fmt_number(item.mint_value) })}</span>
              </dd>
            </div>
            <div>
              <dt>{t('Odds')}</dt>
              <dd>{t('{odds} cards', { odds: odds_label(item.odds) })}</dd>
            </div>
            <div>
              <dt>{t('Made')}</dt>
              <dd>
                {t('{when}, from {source}', { when: when(item.found_at), source: source_label(item.source) })}
                {item.source_run ? (
                  <>
                    {' '}
                    (<a href={`${GAME_URL}/?watch=${encodeURIComponent(item.source_run)}`}>{t('watch the run')}</a>)
                  </>
                ) : null}
              </dd>
            </div>
            <div>
              <dt>{t('Owner')}</dt>
              <dd>
                {mine ? (
                  t('You')
                ) : (
                  <span className="who">
                    <Avatar name={item.owner_name} player={item.owner} size="sm" />
                    <Link to={`/players/${encodeURIComponent(item.owner)}`} viewTransition>
                      {item.owner_name ?? t('A player')}
                    </Link>
                  </span>
                )}
              </dd>
            </div>
            <div>
              <dt>{t('Tradable')}</dt>
              <dd>
                {item.destroyed_at ? (
                  <span className="loss">{tx('No: gone in {upgrade}', { upgrade: <a href={`${CASINO_URL}/upgrade`}>{t('an upgrade')}</a> })}</span>
                ) : item.staked ? (
                  <>
                    {tx('No: staked in {game}', { game: <a href={`${CASINO_URL}/${encodeURIComponent(item.staked)}`}>{t('a casino game')}</a> })}
                  </>
                ) : item.listed ? (
                  t('No: for sale on the market')
                ) : item.tradable ? (
                  <span className="win">{t('Yes')}</span>
                ) : (
                  t('{when} ({date})', { when: fmt_ago(item.tradable_at), date: when(item.tradable_at) })
                )}
              </dd>
            </div>
          </dl>
          {item.listed && item.price !== null ? (
            <div className="for-sale">
              <span>
                {t('For sale')} <Coins value={item.price} size="lg" />
              </span>
              {mine ? (
                <Button tone="grey" busy={busy} onClick={() => act(() => items_api.take_off(item.listed!))} icon={<Icon name="close" />}>
                  {t('Take it off the market')}
                </Button>
              ) : (
                <Button
                  tone="green"
                  busy={busy}
                  disabled={!me.data?.can_trade || (me.data?.coins ?? 0) < item.price}
                  onClick={() => act(() => items_api.buy(item.listed!))}
                  icon={<Icon name="check" />}
                >
                  {t('Buy it for {n} coins', { n: fmt_number(item.price) })}
                </Button>
              )}
            </div>
          ) : null}
          <div className="row">
            {gone ? null : mine ? (
              shown ? (
                <Button tone="grey" busy={busy} onClick={() => showcase(false)} icon={<Icon name="close" />}>
                  {t('Take it off your title screen')}
                </Button>
              ) : (
                <Button busy={busy} onClick={() => showcase(true)} icon={<Icon name="star" />}>
                  {t('Show it on your title screen')}
                </Button>
              )
            ) : (
              <LinkButton
                to={`/trades/new?to=${encodeURIComponent(item.owner)}&take=${encodeURIComponent(item.id)}`}
                tone="orange"
                icon={<Icon name="swap" />}
                viewTransition
              >
                {t('Offer a trade for it')}
              </LinkButton>
            )}
          </div>
          {error ? <Alert>{describe(error)}</Alert> : null}
        </div>
      </section>
      {mine && !gone && item.tradable && me.data?.can_trade ? (
        <Panel title={t('Sell it on the market')} icon="scale">
          <SellForm item={item} onSold={() => detail.reload()} />
        </Panel>
      ) : null}
      <Panel title={t('History')} icon="history">
        <ol className="timeline-v">
          {history.map((h, i) => (
            <Step key={i} h={h} />
          ))}
          {item.destroyed_at ? (
            <li className="timeline-v__step timeline-v__step--casino">
              <span className="timeline-v__dot" aria-hidden>
                <Icon name="flame" />
              </span>
              <div>
                <p className="timeline-v__what">{tx('Put in {upgrade} by {owner}: gone', { upgrade: <a href={`${CASINO_URL}/upgrade`}>{t('an upgrade')}</a>, owner: <strong>{item.owner_name ?? t('a player')}</strong> })}</p>
                <time className="muted" dateTime={item.destroyed_at}>
                  {when(item.destroyed_at)}
                </time>
              </div>
            </li>
          ) : null}
        </ol>
      </Panel>
    </div>
  );
}

/** the item, large, tilting toward the pointer, on a pedestal of light */
function Stage({ item }: { item: Item }) {
  const ref = useTilt<HTMLDivElement>(18);
  return (
    <div className="item-detail__stage" ref={ref}>
      <div className="item-detail__halo" aria-hidden />
      <div className="item-detail__art">
        <ItemArt item={item} scale={3.2} seed={item.id} />
        <span className="item-detail__glare" aria-hidden />
      </div>
      <div className="item-detail__floor" aria-hidden />
    </div>
  );
}

function Step({ h }: { h: Transfer }) {
  const kind = h.game ? 'casino' : h.listing ? 'market' : h.from_player ? 'trade' : 'found';
  return (
    <li className={`timeline-v__step timeline-v__step--${kind}`}>
      <span className="timeline-v__dot" aria-hidden>
        <Icon name={kind === 'casino' ? 'dice' : kind === 'market' ? 'scale' : kind === 'trade' ? 'swap' : 'sparkle'} />
      </span>
      <div>
        <p className="timeline-v__what">
          {h.game && !h.from_player ? (
            <>
              {tx('Won by {to} in {upgrade}', { to: <strong>{h.to_name ?? t('a player')}</strong>, upgrade: <a href={`${CASINO_URL}/upgrade`}>{t('an upgrade')}</a> })}
            </>
          ) : h.game ? (
            <>
              {tx('Won by {to} from {from} in {game}', {
                to: <strong>{h.to_name ?? t('a player')}</strong>,
                from: h.from_name ?? t('a player'),
                game: <a href={`${CASINO_URL}/${encodeURIComponent(h.game)}`}>{t('a casino game')}</a>,
              })}
            </>
          ) : h.listing ? (
            <>
              {tx('Bought by {to} from {from} for {price}', {
                to: <strong>{h.to_name ?? t('a player')}</strong>,
                from: h.from_name ?? t('a player'),
                price: <Coins value={h.price ?? 0} size="sm" />,
              })}
            </>
          ) : h.from_player ? (
            <>
              {tx('Traded from {from} to {to}', { from: h.from_name ?? t('a player'), to: <strong>{h.to_name ?? t('a player')}</strong> })}
            </>
          ) : (
            <>
              {tx('Made for {to}', { to: <strong>{h.to_name ?? t('a player')}</strong> })}
            </>
          )}
        </p>
        <time className="muted" dateTime={h.at}>
          {when(h.at)}
        </time>
      </div>
    </li>
  );
}
