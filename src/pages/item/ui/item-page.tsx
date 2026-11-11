import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { useSession } from '@/entities/session';
import { EDITION_NAMES, ItemArt, RARITY_NAMES, odds_label, source_label, stake_label } from '@/entities/item';
import { describe, items_api, type Item, type Transfer } from '@/shared/api';
import { GAME_URL } from '@/shared/config';
import { use_async } from '@/shared/lib';
import { Alert, Avatar, Button, Icon, LinkButton, Panel, Spinner, useTilt } from '@/shared/ui';

const when = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

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
      <Panel title="Item" icon="cards">
        <Alert>{describe(detail.error)}</Alert>
      </Panel>
    );
  }
  const { item, history } = detail.data!;
  const mine = me.data?.id === item.owner || account?.id === item.owner;
  const shown = me.data?.showcase?.id === item.id;

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
            <Icon name={item.kind === 'tag' ? 'hash' : 'cards'} /> {item.kind === 'tag' ? 'Tag' : 'Joker'} · #{item.serial} of the {item.minted} found
          </p>
          <h1 className="page-title" id="item-title">
            {item.name}
          </h1>
          <p className="item-detail__chips">
            <span className={`rarity rarity--${item.rarity}`}>{RARITY_NAMES[item.rarity]}</span>
            {item.edition !== 'base' ? <span className={`edition edition--${item.edition}`}>{EDITION_NAMES[item.edition]}</span> : null}
            {item.stake ? <span className={`stake stake--${item.stake}`}>Won at {stake_label(item.stake)}</span> : null}
            {shown ? (
              <span className="tag tag--gold">
                <Icon name="star" /> On your title screen
              </span>
            ) : null}
          </p>
          <dl className="specs">
            <div>
              <dt>Odds</dt>
              <dd>{odds_label(item.odds)} drops</dd>
            </div>
            <div>
              <dt>Found</dt>
              <dd>
                {when(item.found_at)}, from {source_label(item.source)}
                {item.source_run ? (
                  <>
                    {' '}
                    (<a href={`${GAME_URL}/?watch=${encodeURIComponent(item.source_run)}`}>watch the run</a>)
                  </>
                ) : null}
              </dd>
            </div>
            <div>
              <dt>Owner</dt>
              <dd>
                {mine ? (
                  'You'
                ) : (
                  <span className="who">
                    <Avatar name={item.owner_name} size="sm" />
                    <Link to={`/players/${encodeURIComponent(item.owner)}`} viewTransition>
                      {item.owner_name ?? 'A player'}
                    </Link>
                  </span>
                )}
              </dd>
            </div>
            <div>
              <dt>Tradable</dt>
              <dd>
                {item.staked ? (
                  <>
                    No: staked in a{' '}
                    <Link to={`/casino/${encodeURIComponent(item.staked)}`} viewTransition>
                      casino game
                    </Link>
                  </>
                ) : item.tradable ? (
                  <span className="win">Yes</span>
                ) : (
                  `From ${when(item.tradable_at)}`
                )}
              </dd>
            </div>
          </dl>
          <div className="row">
            {mine ? (
              shown ? (
                <Button tone="grey" busy={busy} onClick={() => showcase(false)} icon={<Icon name="close" />}>
                  Take it off your title screen
                </Button>
              ) : (
                <Button busy={busy} onClick={() => showcase(true)} icon={<Icon name="star" />}>
                  Show it on your title screen
                </Button>
              )
            ) : (
              <LinkButton
                to={`/trades/new?to=${encodeURIComponent(item.owner)}&take=${encodeURIComponent(item.id)}`}
                tone="orange"
                icon={<Icon name="swap" />}
                viewTransition
              >
                Offer a trade for it
              </LinkButton>
            )}
          </div>
          {error ? <Alert>{describe(error)}</Alert> : null}
        </div>
      </section>
      <Panel title="History" icon="history">
        <ol className="timeline-v">
          {history.map((h, i) => (
            <Step key={i} h={h} />
          ))}
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
        <ItemArt item={item} scale={3.2} />
        <span className="item-detail__glare" aria-hidden />
      </div>
      <div className="item-detail__floor" aria-hidden />
    </div>
  );
}

function Step({ h }: { h: Transfer }) {
  const kind = h.game ? 'casino' : h.from_player ? 'trade' : 'found';
  return (
    <li className={`timeline-v__step timeline-v__step--${kind}`}>
      <span className="timeline-v__dot" aria-hidden>
        <Icon name={kind === 'casino' ? 'dice' : kind === 'trade' ? 'swap' : 'sparkle'} />
      </span>
      <div>
        <p className="timeline-v__what">
          {h.game ? (
            <>
              Won by <strong>{h.to_name ?? 'a player'}</strong> from {h.from_name ?? 'a player'} in{' '}
              <Link to={`/casino/${encodeURIComponent(h.game)}`} viewTransition>
                a casino game
              </Link>
            </>
          ) : h.from_player ? (
            <>
              Traded from {h.from_name ?? 'a player'} to <strong>{h.to_name ?? 'a player'}</strong>
            </>
          ) : (
            <>
              Found by <strong>{h.to_name ?? 'a player'}</strong>
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
