import { useSearchParams } from 'react-router';
import { useSession } from '@/entities/session';
import { DeleteAccount } from './delete-account';
import { DisplayNameForm } from './display-name-form';
import { SignOutButtons } from './sessions';
import { SignInMethods } from './sign-in-methods';
import { Alert, Panel } from '@/shared/ui';

const since = new Intl.DateTimeFormat(undefined, { dateStyle: 'long' });

export function AccountPage() {
  const { account } = useSession();
  const [params] = useSearchParams();
  if (!account) return null;
  const linked = params.get('linked');
  return (
    <div className="stack">
      {linked === 'google' && account.providers.includes('google') ? (
        <Alert tone="success">Google is linked: you can sign in with it from now on.</Alert>
      ) : null}
      <Panel title="Your account">
        <p>
          <strong>{account.email}</strong>
          {account.email_verified ? null : <span className="tag tag--warn">not verified</span>}
          <span className="muted"> · since {since.format(new Date(account.created_at))}</span>
        </p>
        {account.roles?.length ? (
          <p>
            Roles:{' '}
            {account.roles.map((r) => (
              <span key={r} className={`role role--${r}`}>{r}</span>
            )).reduce<React.ReactNode[]>((all, el, i) => (i ? [...all, ' ', el] : [el]), [])}
          </p>
        ) : null}
        <DisplayNameForm />
      </Panel>
      <Panel title="Sign-in methods">
        <SignInMethods />
      </Panel>
      <Panel title="Sessions">
        <SignOutButtons />
      </Panel>
      <Panel title="Delete the account">
        <DeleteAccount />
      </Panel>
    </div>
  );
}
