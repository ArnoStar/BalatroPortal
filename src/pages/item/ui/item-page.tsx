import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { useSession } from '@/entities/session';
import { EDITION_NAMES, ItemArt, RARITY_NAMES, odds_label, source_label, stake_label } from '@/entities/item';
import { describe, items_api } from '@/shared/api';
import { GAME_URL } from '@/shared/config';
import { use_async } from '@/shared/lib';
import { Alert, Button, LinkButton, Panel, Spinner } from '@/shared/ui';

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
      <Panel title="Item">
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
      <Panel title={item.name}>
        <div className="item-hero">
          <ItemArt item={item} scale={3} />
          <dl>
            <dt>Rarity</dt>
            <dd><span className={`rarity rarity--${item.rarity}`}>{RARITY_NAMES[item.rarity]}</span> {item.kind}</dd>
            <dt>Edition</dt>
            <dd><span className={`edition edition--${item.edition}`}>{EDITION_NAMES[item.edition]}</span></dd>
            <dt>Number</dt>
            <dd>#{item.serial} of the {item.minted} found</dd>
            <dt>Odds</dt>
            <dd>{odds_label(item.odds)} drops</dd>
            {item.stake ? (<><dt>Won at</dt><dd><span className={`stake stake--${item.stake}`}>{stake_label(item.stake)}</span></dd></>) : null}
            <dt>Found</dt>
            <dd>
              {when(item.found_at)}, from {source_label(item.source)}
              {item.source_run ? <> (<a href={`${GAME_URL}/?watch=${encodeURIComponent(item.source_run)}`}>watch the run</a>)</> : null}
            </dd>
            <dt>Owner</dt>
            <dd>{mine ? 'You' : <Link to={`/players/${encodeURIComponent(item.owner)}`}>{item.owner_name ?? 'A player'}</Link>}</dd>
            <dt>Tradable</dt>
            <dd>{item.tradable ? 'Yes' : `From ${when(item.tradable_at)}`}</dd>
          </dl>
        </div>
        <div className="row">
          {mine ? (
            shown ? (
              <Button tone="grey" busy={busy} onClick={() => showcase(false)}>Take it off your title screen</Button>
            ) : (
              <Button busy={busy} onClick={() => showcase(true)}>Show it on your title screen</Button>
            )
          ) : (
            <LinkButton to={`/trades/new?to=${encodeURIComponent(item.owner)}&take=${encodeURIComponent(item.id)}`} tone="orange">
              Offer a trade for it
            </LinkButton>
          )}
        </div>
        {error ? <Alert>{describe(error)}</Alert> : null}
      </Panel>
      <Panel title="History">
        <ol className="plain-list">
          {history.map((h, i) => (
            <li key={i}>
              {when(h.at)}: {h.from_player ? <>from {h.from_name ?? 'a player'} to {h.to_name ?? 'a player'} (a trade)</> : <>found by {h.to_name ?? 'a player'}</>}
            </li>
          ))}
        </ol>
      </Panel>
    </div>
  );
}
