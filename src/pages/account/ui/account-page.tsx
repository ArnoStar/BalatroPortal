import { useSearchParams } from 'react-router';
import { useSession } from '@/entities/session';
import { DeleteAccount } from './delete-account';
import { DisplayNameForm } from './display-name-form';
import { GameSettings } from './game-settings';
import { SignOutButtons } from './sessions';
import { SignInMethods } from './sign-in-methods';
import { Alert, Avatar, Icon, LinkButton, PageHeader, Panel } from '@/shared/ui';

const since = new Intl.DateTimeFormat(undefined, { dateStyle: 'long' });

export function AccountPage() {
  const { account } = useSession();
  const [params] = useSearchParams();
  if (!account) return null;
  const linked = params.get('linked');
  return (
    <div className="stack">
      <PageHeader eyebrow="You" icon="settings" title="Your account" />
      {linked === 'google' && account.providers.includes('google') ? (
        <Alert tone="success">Google is linked: you can sign in with it from now on.</Alert>
      ) : null}
      <div className="account">
        <aside className="account__card" aria-label="Your account">
          <Avatar name={account.display_name} size="xl" />
          <h2 className="account__name">{account.display_name}</h2>
          <p className="account__email">
            <Icon name="mail" />
            {account.email}
            {account.email_verified ? (
              <span className="tag tag--win">
                <Icon name="check" /> verified
              </span>
            ) : (
              <span className="tag tag--warn">not verified</span>
            )}
          </p>
          <p className="muted">Since {since.format(new Date(account.created_at))}</p>
          {account.roles?.length ? (
            <p className="account__roles" aria-label="Roles">
              {account.roles.map((r) => (
                <span key={r} className={`role role--${r}`}>
                  {r}
                </span>
              ))}
            </p>
          ) : null}
          <LinkButton to="/players/me" tone="grey" wide icon={<Icon name="user" />} viewTransition>
            See your profile
          </LinkButton>
        </aside>
        <div className="stack">
          <Panel title="Display name" icon="user">
            <DisplayNameForm />
          </Panel>
          <Panel title="In the game" icon="play">
            <GameSettings />
          </Panel>
          <Panel title="Sign-in methods" icon="key">
            <SignInMethods />
          </Panel>
          <Panel title="Sessions" icon="logout">
            <SignOutButtons />
          </Panel>
          <Panel title="Delete the account" icon="trash" tone="danger">
            <DeleteAccount />
          </Panel>
        </div>
      </div>
    </div>
  );
}
