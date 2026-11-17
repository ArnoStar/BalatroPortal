import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { deck_name, stake_name } from '@/entities/catalog';
import { PresenceDot, presence_text, useSocial } from '@/entities/social';
import { describe, game_api, social_api, type FriendRequest, type PlayerRef, type SocialPlayer } from '@/shared/api';
import { format_number, time_ago, use_async } from '@/shared/lib';
import { Alert, Avatar, Button, CopyText, EmptyState, Icon, LinkButton, PageHeader, Panel, Segmented, Spinner } from '@/shared/ui';
import { t } from '@/shared/i18n';

type Tab = 'friends' | 'requests' | 'add' | 'blocked';
const NAMES = { deck: deck_name, stake: stake_name };

/** /friends (and /friends/add/:code, an invite link): friends, requests, adding and blocking players */
export function FriendsPage() {
  const social = useSocial();
  const { code } = useParams();
  const [tab, setTab] = useState<Tab>(code ? 'add' : 'friends');
  const online = social.friends.filter((f) => f.presence?.online).length;
  return (
    <div className="stack">
      <PageHeader
        eyebrow={t('Social')}
        icon="users"
        title={t('Friends')}
        lead={t('See who is online and what they play, write to them, and share your runs and seeds.')}
        actions={
          <LinkButton to="/chat" icon={<Icon name="chat" />} viewTransition>
            {t('Chat')}{social.unread ? ` (${social.unread})` : ''}
          </LinkButton>
        }
      />
      {code ? <Invite code={code} /> : null}
      {social.error && !social.me ? <Alert>{describe(social.error)}</Alert> : null}
      <div>
        <Segmented
          label={t('Friends')}
          value={tab}
          onChange={setTab}
          options={[
            ['friends', `${t('Friends')} · ${social.friends.length}`],
            ['requests', social.incoming.length ? `${t('Requests')} · ${social.incoming.length}` : t('Requests')],
            ['add', t('Add a friend')],
            ['blocked', t('Blocked')],
          ]}
        />
      </div>
      {tab === 'friends' ? (
        <>
          <Panel title={t('Your friends')} icon="users" actions={social.friends.length ? <span className="muted">{t('{n} online', { n: online })}</span> : null}>
            <FriendList onAdd={() => setTab('add')} />
          </Panel>
          {social.friends.length ? <FriendsBoard /> : null}
        </>
      ) : null}
      {tab === 'requests' ? <Requests /> : null}
      {tab === 'add' ? <AddFriend /> : null}
      {tab === 'blocked' ? <Blocked /> : null}
    </div>
  );
}

function FriendList({ onAdd }: { onAdd: () => void }) {
  const social = useSocial();
  const navigate = useNavigate();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);

  async function act(f: SocialPlayer, what: 'message' | 'remove' | 'block') {
    if (what === 'remove' && !window.confirm(`Remove ${f.name ?? 'this player'} from your friends?`)) return;
    if (what === 'block' && !window.confirm(t('Block {name}? You stop being friends; they can’t ask you again nor write to you.', { name: f.name ?? t('this player') }))) return;
    setBusy(`${what}:${f.id}`);
    setError(null);
    try {
      if (what === 'message') {
        const c = await social_api.direct(f.id);
        social.apply({ type: 'conversation', data: c });
        navigate(`/chat/${c.id}`, { viewTransition: true });
      } else {
        if (what === 'remove') await social_api.remove_friend(f.id);
        else await social_api.block(f.id);
        social.apply({ type: 'friend_removed', data: { id: f.id } });
      }
    } catch (e) {
      setError(e);
    } finally {
      setBusy(null);
    }
  }

  if (!social.me && !social.error) return <Spinner />;
  if (!social.friends.length) {
    return (
      <EmptyState
        icon="user-plus"
        title={t('No friend yet')}
        action={
          <Button onClick={onAdd} icon={<Icon name="user-plus" />}>
            {t('Add a friend')}
          </Button>
        }
      >
        {t('Find players by name, or send them your invite link.')}
      </EmptyState>
    );
  }
  return (
    <>
      {error ? <Alert>{describe(error)}</Alert> : null}
      <ul className="people">
        {social.friends.map((f) => (
          <li key={f.id} className={`person${f.presence?.online ? ' person--online' : ''}`}>
            <span className="person__avatar">
              <Avatar name={f.name} player={f.id} />
              <PresenceDot presence={f.presence} />
            </span>
            <div className="person__info">
              <Link to={`/players/${encodeURIComponent(f.id)}`} className="person__name" viewTransition>
                {f.name ?? t('A player')}
              </Link>
              <span className={`person__status${f.presence?.activity?.kind === 'run' ? ' person__status--playing' : ''}`}>
                {presence_text(f.presence, NAMES, time_ago)}
              </span>
            </div>
            <div className="person__actions">
              <Button size="sm" busy={busy === `message:${f.id}`} onClick={() => act(f, 'message')} icon={<Icon name="chat" />}>
                {t('Message')}
              </Button>
              <Button size="sm" tone="ghost" busy={busy === `remove:${f.id}`} onClick={() => act(f, 'remove')} icon={<Icon name="user-minus" />} aria-label={`Remove ${f.name ?? 'this player'}`}>
                {t('Remove')}
              </Button>
              <Button size="sm" tone="ghost" busy={busy === `block:${f.id}`} onClick={() => act(f, 'block')} icon={<Icon name="ban" />} aria-label={`Block ${f.name ?? 'this player'}`}>
                {t('Block')}
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

/** the bests of the player and their friends side by side (their public profiles in the game API) */
function FriendsBoard() {
  const social = useSocial();
  const ids = [social.me?.id, ...social.friends.map((f) => f.id)].filter((x): x is string => !!x);
  const key = ids.join(',');
  const profiles = use_async(() => Promise.all(ids.map((id) => game_api.player(id).catch(() => null))), [key]);
  const rows = (profiles.data ?? [])
    .filter((p): p is NonNullable<typeof p> => !!p)
    .map((p) => ({ id: p.id, name: p.you ? t('You') : p.name ?? t('A player'), you: p.you, stats: p.stats }))
    .sort((a, b) => Number(b.stats?.high_scores.best_hand ?? -1) - Number(a.stats?.high_scores.best_hand ?? -1));
  return (
    <Panel title={t('Among friends')} icon="trophy" actions={<span className="muted">{t('From their profiles (counted runs)')}</span>}>
      {profiles.loading && !profiles.data ? <Spinner /> : null}
      {profiles.data && !rows.length ? <p className="muted">{t('Your friends\' bests show up here once you have played.')}</p> : null}
      {rows.length ? (
        <div className="table-scroll">
          <table className="table board">
            <thead>
              <tr>
                <th scope="col" className="num">#</th>
                <th scope="col">{t('Player')}</th>
                <th scope="col" className="num">{t('Best hand')}</th>
                <th scope="col" className="num">{t('Highest ante')}</th>
                <th scope="col" className="num">{t('Wins')}</th>
                <th scope="col" className="num">{t('Runs')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id} className={r.you ? 'board__you' : undefined}>
                  <td className="num">
                    {r.stats ? <span className={i < 3 ? `medal medal--${i + 1}` : 'board__rank'}>{i + 1}</span> : '–'}
                  </td>
                  <th scope="row">
                    <span className="who">
                      <Avatar name={r.name} player={r.id} size="sm" />
                      {r.you ? t('You') : (
                        <Link to={`/players/${encodeURIComponent(r.id)}`} viewTransition>
                          {r.name}
                        </Link>
                      )}
                    </span>
                  </th>
                  {r.stats ? (
                    <>
                      <td className="num">{format_number(r.stats.high_scores.best_hand)}</td>
                      <td className="num">{r.stats.high_scores.highest_ante}</td>
                      <td className="num win">{r.stats.runs.won}</td>
                      <td className="num">{r.stats.runs.total}</td>
                    </>
                  ) : (
                    <td colSpan={4} className="muted">
                      {t('A private profile')}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </Panel>
  );
}

function Requests() {
  const social = useSocial();
  const outgoing = social.requests.filter((r) => r.sender.id === social.me?.id);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);

  async function answer(r: FriendRequest, a: 'accept' | 'decline' | 'cancel') {
    setBusy(`${a}:${r.id}`);
    setError(null);
    try {
      social.apply({ type: 'friend_request', data: await social_api.answer(r.id, a) });
      if (a === 'accept') social.reload();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(null);
    }
  }

  const row = (r: FriendRequest, other: PlayerRef, actions: ReactNode) => (
    <li key={r.id} className="person">
      <span className="person__avatar">
        <Avatar name={other.name} player={other.id} />
      </span>
      <div className="person__info">
        <Link to={`/players/${encodeURIComponent(other.id)}`} className="person__name" viewTransition>
          {other.name ?? t('A player')}
        </Link>
        <span className="person__status">{time_ago(r.created_at)}</span>
      </div>
      <div className="person__actions">{actions}</div>
    </li>
  );
  return (
    <div className="grid-2">
      {error ? <Alert>{describe(error)}</Alert> : null}
      <Panel title={t('For you')} icon="user-plus">
        {social.incoming.length ? (
          <ul className="people">
            {social.incoming.map((r) => row(r, r.sender, (
              <>
                <Button size="sm" tone="green" busy={busy === `accept:${r.id}`} onClick={() => answer(r, 'accept')} icon={<Icon name="check" />}>
                  {t('Accept')}
                </Button>
                <Button size="sm" tone="ghost" busy={busy === `decline:${r.id}`} onClick={() => answer(r, 'decline')} icon={<Icon name="close" />}>
                  {t('Decline')}
                </Button>
              </>
            )))}
          </ul>
        ) : (
          <EmptyState icon="user-plus" title={t('No request waiting')}>
            {t('When a player asks to be your friend, it shows up here.')}
          </EmptyState>
        )}
      </Panel>
      <Panel title={t('Sent')} icon="send">
        {outgoing.length ? (
          <ul className="people">
            {outgoing.map((r) => row(r, r.recipient, (
              <Button size="sm" tone="ghost" busy={busy === `cancel:${r.id}`} onClick={() => answer(r, 'cancel')} icon={<Icon name="close" />}>
                {t('Take back')}
              </Button>
            )))}
          </ul>
        ) : (
          <p className="muted">{t('Your requests waiting for an answer show up here.')}</p>
        )}
      </Panel>
    </div>
  );
}

/** the button for a player found by name or by code, as they are related to the caller */
function AskButton({ player, onDone }: { player: SocialPlayer; onDone: (p: SocialPlayer) => void }) {
  const social = useSocial();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  async function ask() {
    setBusy(true);
    setError(null);
    try {
      const r = await social_api.ask({ to: player.id });
      social.apply({ type: 'friend_request', data: r });
      if (r.status === 'accepted') social.reload();
      onDone({ ...player, relation: r.status === 'accepted' ? 'friend' : 'outgoing', request: r.id });
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  if (player.relation === 'you') return <span className="tag tag--you">{t('You')}</span>;
  if (player.relation === 'friend') return <span className="tag tag--win"><Icon name="user-check" /> {t('Friends')}</span>;
  if (player.relation === 'blocked') return <span className="tag tag--muted"><Icon name="ban" /> {t('Blocked')}</span>;
  if (player.relation === 'outgoing') return <span className="tag"><Icon name="clock" /> {t('Asked')}</span>;
  return (
    <span className="row">
      <Button size="sm" tone={player.relation === 'incoming' ? 'green' : 'blue'} busy={busy} onClick={ask} icon={<Icon name="user-plus" />}>
        {player.relation === 'incoming' ? t('Accept their request') : t('Add friend')}
      </Button>
      {error ? <span className="loss">{describe(error)}</span> : null}
    </span>
  );
}

function AddFriend() {
  const social = useSocial();
  const [q, setQ] = useState('');
  const [found, setFound] = useState<SocialPlayer[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [code, setCode] = useState('');
  const [sent, setSent] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) {
      setFound(null);
      return;
    }
    let live = true;
    setSearching(true);
    const t = setTimeout(() => {
      social_api.find(query).then(
        (r) => live && setFound(r),
        () => live && setFound([]),
      ).finally(() => live && setSearching(false));
    }, 250);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [q]);

  async function by_code(e: FormEvent) {
    e.preventDefault();
    setBusy('code');
    setError(null);
    setSent(null);
    try {
      const r = await social_api.ask({ code });
      social.apply({ type: 'friend_request', data: r });
      if (r.status === 'accepted') social.reload();
      setSent(r.status === 'accepted' ? t('You and {name} are friends now.', { name: r.sender.name ?? t('this player') }) : t('Your request is sent to {name}.', { name: r.recipient.name ?? t('this player') }));
      setCode('');
    } catch (err) {
      setError(err);
    } finally {
      setBusy(null);
    }
  }

  async function change(changes: { requests?: 'everyone' | 'code'; show_presence?: boolean } | 'code') {
    if (changes === 'code' && !window.confirm(t('Make a new friend code? The old one, and the links with it, stop working.'))) return;
    setBusy(changes === 'code' ? 'new-code' : 'settings');
    setError(null);
    try {
      const me = changes === 'code' ? await social_api.new_code() : await social_api.update_me(changes);
      social.apply({ type: 'me', data: me });
    } catch (err) {
      setError(err);
    } finally {
      setBusy(null);
    }
  }

  const me = social.me;
  const link = me ? `${window.location.origin}/friends/add/${me.friend_code}` : '';
  return (
    <div className="grid-2">
      <Panel title={t('Find a player')} icon="search">
        <div className="field">
          <label htmlFor="find-player">{t('Their name')}</label>
          <input id="find-player" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('Two letters at least')} autoComplete="off" />
        </div>
        {searching && !found ? <Spinner label={t('Searching')} /> : null}
        {found?.length === 0 ? <p className="muted">{t('Nobody by that name (players who take requests only with their code aren’t listed).')}</p> : null}
        {found?.length ? (
          <ul className="people">
            {found.map((p) => (
              <li key={p.id} className="person">
                <span className="person__avatar">
                  <Avatar name={p.name} player={p.id} />
                </span>
                <div className="person__info">
                  <Link to={`/players/${encodeURIComponent(p.id)}`} className="person__name" viewTransition>
                    {p.name ?? t('A player')}
                  </Link>
                </div>
                <div className="person__actions">
                  <AskButton player={p} onDone={(np) => setFound((list) => list?.map((x) => (x.id === np.id ? np : x)) ?? null)} />
                </div>
              </li>
            ))}
          </ul>
        ) : null}
        <form className="code-form" onSubmit={by_code}>
          <div className="field">
            <label htmlFor="friend-code">{t('Or their friend code')}</label>
            <input id="friend-code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder={t('ABCD-2345')} autoComplete="off" spellCheck={false} />
          </div>
          <Button type="submit" busy={busy === 'code'} disabled={code.replace(/[\s-]/g, '').length !== 8} icon={<Icon name="user-plus" />}>
            {t('Send a request')}
          </Button>
        </form>
        {sent ? <Alert tone="success">{sent}</Alert> : null}
        {error ? <Alert>{describe(error)}</Alert> : null}
      </Panel>
      <Panel title={t('Your invite')} icon="link" tone="glow">
        {me ? (
          <div className="stack stack--tight">
            <p className="muted">{t('Players add you with your friend code, or with your link: it opens this page with your name.')}</p>
            <div className="friend-code">
              <span className="friend-code__code">{me.friend_code}</span>
              <CopyText text={me.friend_code} label={t('Friend code')}>
                {t('Copy')}
              </CopyText>
            </div>
            <CopyText text={link} label={t('Invite link')}>
              <span className="mono">{link}</span>
            </CopyText>
            <div className="row">
              <Button size="sm" tone="ghost" busy={busy === 'new-code'} onClick={() => change('code')} icon={<Icon name="refresh" />}>
                {t('New code')}
              </Button>
            </div>
            <fieldset className="settings">
              <legend>{t('Who can send you friend requests')}</legend>
              <Segmented
                label={t('Who can send you friend requests')}
                value={me.requests}
                onChange={(requests) => change({ requests })}
                options={[['everyone', t('Everyone')], ['code', t('Only with my code')]]}
              />
              <label className="check">
                <input type="checkbox" role="switch" checked={me.show_presence} disabled={busy === 'settings'} onChange={(e) => change({ show_presence: e.target.checked })} />
                <span className="check__text">
                  <strong>{t('My friends see when I’m online and what I play')}</strong>
                  <span>{t('Off: you look offline to them, and they don’t see what you play.')}</span>
                </span>
              </label>
            </fieldset>
          </div>
        ) : (
          <Spinner />
        )}
      </Panel>
    </div>
  );
}

function Blocked() {
  const blocks = use_async(() => social_api.blocks(), []);
  const [busy, setBusy] = useState<string | null>(null);
  async function unblock(id: string) {
    setBusy(id);
    try {
      await social_api.unblock(id);
      blocks.reload();
    } finally {
      setBusy(null);
    }
  }
  return (
    <Panel title={t('Blocked players')} icon="ban">
      {blocks.loading && !blocks.data ? <Spinner /> : null}
      {blocks.error ? <Alert>{describe(blocks.error)}</Alert> : null}
      {blocks.data?.length === 0 ? <p className="muted">{t('Nobody. A blocked player can’t ask to be your friend, write to you, or find you by name.')}</p> : null}
      {blocks.data?.length ? (
        <ul className="people">
          {blocks.data.map((p) => (
            <li key={p.id} className="person">
              <span className="person__avatar">
                <Avatar name={p.name} player={p.id} />
              </span>
              <div className="person__info">
                <span className="person__name">{p.name ?? t('A player')}</span>
              </div>
              <div className="person__actions">
                <Button size="sm" tone="ghost" busy={busy === p.id} onClick={() => unblock(p.id)}>
                  {t('Unblock')}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </Panel>
  );
}

/** /friends/add/:code: an invite link's player */
function Invite({ code }: { code: string }) {
  const player = use_async(() => social_api.by_code(code), [code]);
  const [p, setP] = useState<SocialPlayer | null>(null);
  const shown = p ?? player.data;
  return (
    <Panel title={t('An invite')} icon="link" tone="glow">
      {player.loading && !player.data ? <Spinner /> : null}
      {player.error ? <Alert>{describe(player.error)}</Alert> : null}
      {shown ? (
        <div className="invite">
          <Avatar name={shown.name} player={shown.id} size="lg" />
          <div>
            <p className="invite__name">{shown.name ?? t('A player')}</p>
            <p className="muted">{shown.relation === 'you' ? t('This is your own invite link.') : t('wants to be your friend on Balatro.')}</p>
          </div>
          <AskButton player={shown} onDone={setP} />
        </div>
      ) : null}
    </Panel>
  );
}
