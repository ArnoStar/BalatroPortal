import { useSession } from '@/entities/session';
import { DeleteAccount } from './delete-account';
import { DisplayNameForm } from './display-name-form';
import { SignOutButtons } from './sessions';
import { SignInMethods } from './sign-in-methods';
import { Panel } from '@/shared/ui';

const since = new Intl.DateTimeFormat(undefined, { dateStyle: 'long' });

export function AccountPage() {
  const { account } = useSession();
  if (!account) return null;
  return (
    <div className="stack">
      <Panel title="Your account">
        <p>
          <strong>{account.email}</strong>
          {account.email_verified ? null : <span className="tag tag--warn">not verified</span>}
          <span className="muted"> · since {since.format(new Date(account.created_at))}</span>
        </p>
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
