import { useSearchParams } from 'react-router';
import { describe, items_api, type CasinoRules } from '@/shared/api';
import { use_async } from '@/shared/lib';
import { Alert, Icon, LinkButton, PageHeader, Panel, Segmented, Spinner } from '@/shared/ui';
import { Coinflips } from './coinflips';
import { History } from './history';
import { Jackpot } from './jackpot';

const TABS = [
  ['coinflip', 'Coinflip'],
  ['jackpot', 'Jackpot'],
  ['history', 'History'],
] as const;
type Tab = (typeof TABS)[number][0];

/** /casino?tab=coinflip|jackpot|history: stake your items against other players' */
export function CasinoPage() {
  const [params, setParams] = useSearchParams();
  const tab: Tab = TABS.find(([t]) => t === params.get('tab'))?.[0] ?? 'coinflip';
  const me = use_async(() => items_api.me(), []);
  const rules = use_async(() => items_api.casino_rules(), []);
  const mine = use_async(() => items_api.mine(), []);

  if ((me.loading && !me.data) || (rules.loading && !rules.data)) return <Spinner />;
  if (me.error || rules.error) {
    return (
      <Panel title="Casino" icon="dice">
        <Alert>{describe(me.error ?? rules.error)}</Alert>
      </Panel>
    );
  }
  const m = me.data!;
  const r = rules.data!;
  const can_play = r.open && m.can_trade;
  const items = mine.data ?? [];
  const props = { me: m, rules: r, mine: items, canPlay: can_play, onItems: mine.reload };
  return (
    <div className="stack casino">
      <PageHeader
        eyebrow="Items"
        icon="dice"
        title={<span className="neon">Casino</span>}
        lead="Stake your items against other players': the winner takes every item of the game. The casino has no items of its own and takes nothing. An item is worth its odds (an item found 1 in 4,520 drops is worth 4,520), and your chance is your share of the pot."
        actions={
          <LinkButton to="/inventory" tone="grey" icon={<Icon name="cards" />} viewTransition>
            Your items
          </LinkButton>
        }
      />
      {!r.open ? <Alert tone="info">The casino is closed for now. Items you staked can still be taken back.</Alert> : null}
      {!m.can_trade ? <Alert tone="info">The casino opens after your first win (a counted run).</Alert> : null}
      {mine.error ? <Alert>{describe(mine.error)}</Alert> : null}
      <div>
        <Segmented
          label="Games"
          className="casino__tabs"
          value={tab}
          onChange={(t) => setParams({ tab: t })}
          options={TABS.map(([t, label]) => [t, <><Icon name={t === 'coinflip' ? 'dice' : t === 'jackpot' ? 'coins' : 'history'} /> {label}</>] as const)}
        />
      </div>
      {tab === 'coinflip' ? <Coinflips {...props} /> : tab === 'jackpot' ? <Jackpot {...props} /> : <History me={m} />}
      <Rules rules={r} />
    </div>
  );
}

function Rules({ rules }: { rules: CasinoRules }) {
  return (
    <Panel title="Rules" icon="scale">
      <ul className="rules rules--casino">
        <li>
          <Icon name="lock" />
          <span>
            Only players with a counted win play, and only items out of their trade hold are staked: what you win can't be staked again for{' '}
            {rules.trade_hold_days} days.
          </span>
        </li>
        <li>
          <Icon name="layers" />
          <span>
            Up to {rules.max_items} items at once. A coinflip is matched with items worth {rules.coinflip_margin}% more or less; at most{' '}
            {rules.max_open_coinflips} open coinflips each.
          </span>
        </li>
        <li>
          <Icon name="users" />
          <span>
            The pot holds {rules.jackpot_max_items} items of {rules.jackpot_max_players} players at most, and is drawn {rules.jackpot_seconds} seconds
            after a second player comes in.
          </span>
        </li>
        <li>
          <Icon name="refresh" />
          <span>A staked item stays yours, but can't be traded until its game ends. Alone in a game, you may take your items back.</span>
        </li>
      </ul>
      <div className="fair-note">
        <Icon name="shield" />
        <p>
          <strong>Provably fair.</strong> Each game has a secret server seed whose SHA-256 is shown from the start, and every stake brings a seed of
          your browser's. The draw is HMAC-SHA256 of the game's id and the players' seeds, keyed with the server seed; the server seed is shown
          when the game is over, so every game's page can check its draw in your browser.
        </p>
      </div>
    </Panel>
  );
}
