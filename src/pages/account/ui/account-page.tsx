import { useSearchParams } from 'react-router';
import { useSession } from '@/entities/session';
import { DeleteAccount } from './delete-account';
import { DisplayNameForm } from './display-name-form';
import { GameSettings } from './game-settings';
import { ProfilePicture } from './profile-picture';
import { SignOutButtons } from './sessions';
import { SignInMethods } from './sign-in-methods';
import { Alert, Avatar, Icon, LinkButton, PageHeader, Panel } from '@/shared/ui';
import { current_lang, t } from '@/shared/i18n';

const since = { format: (d: Date) => new Intl.DateTimeFormat(current_lang(), { dateStyle: 'long' }).format(d) };

export function AccountPage() {
  const { account } = useSession();
  const [params] = useSearchParams();
  if (!account) return null;
  const linked = params.get('linked');
  return (
    <div className="stack">
      <PageHeader eyebrow={t('You')} icon="settings" title={t('Your account')} />
      {linked === 'google' && account.providers.includes('google') ? (
        <Alert tone="success">{t('Google is linked: you can sign in with it from now on.')}</Alert>
      ) : null}
      <div className="account">
        <aside className="account__card" aria-label={t('Your account')}>
          <Avatar name={account.display_name} player={account.id} size="xl" />
          <h2 className="account__name">{account.display_name}</h2>
          <p className="account__email">
            <Icon name="mail" />
            {account.email}
            {account.email_verified ? (
              <span className="tag tag--win">
                <Icon name="check" /> verified
              </span>
            ) : (
              <span className="tag tag--warn">{t('not verified')}</span>
            )}
          </p>
          <p className="muted">{t('Since {date}', { date: since.format(new Date(account.created_at)) })}</p>
          {account.roles?.length ? (
            <p className="account__roles" aria-label={t('Roles')}>
              {account.roles.map((r) => (
                <span key={r} className={`role role--${r}`}>
                  {r}
                </span>
              ))}
            </p>
          ) : null}
          <LinkButton to="/players/me" tone="grey" wide icon={<Icon name="user" />} viewTransition>
            {t('See your profile')}
          </LinkButton>
        </aside>
        <div className="stack">
          <Panel title={t('Display name')} icon="user">
            <DisplayNameForm />
          </Panel>
          <Panel title={t('Profile picture')} icon="image">
            <ProfilePicture />
          </Panel>
          <Panel title={t('In the game')} icon="play">
            <GameSettings />
          </Panel>
          <Panel title={t('Sign-in methods')} icon="key">
            <SignInMethods />
          </Panel>
          <Panel title={t('Sessions')} icon="logout">
            <SignOutButtons />
          </Panel>
          <Panel title={t('Delete the account')} icon="trash" tone="danger">
            <DeleteAccount />
          </Panel>
        </div>
      </div>
    </div>
  );
}
