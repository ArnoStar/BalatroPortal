import { Navigate, useSearchParams } from 'react-router';
import { useSession } from '@/entities/session';
import { LoginForm, ProviderButtons } from '@/features/auth';
import { AuthShell } from '@/widgets/auth-shell';
import { GAME_URL } from '@/shared/config';
import { safe_next } from '@/shared/lib';
import { Alert, Spinner } from '@/shared/ui';

export function LoginPage() {
  const [params] = useSearchParams();
  const { status, offline } = useSession();
  const next = safe_next(params.get('next'));

  if (status === 'loading') return <Spinner />;
  if (status === 'signed-in') {
    if (next !== GAME_URL && !next.startsWith(`${GAME_URL}/`)) return <Navigate to={next} replace />;
    window.location.replace(next); // the game is another app
    return <Spinner label="Opening the game" />;
  }
  return (
    <AuthShell title="Sign in" icon="login" lead="Welcome back: your runs are waiting.">
      {offline ? <Alert>The sign-in service can't be reached right now.</Alert> : null}
      {params.get('confirmed') ? <Alert tone="success">Your email is confirmed. Sign in to continue.</Alert> : null}
      <LoginForm next={next} email={params.get('email') ?? ''} />
      <ProviderButtons next={next} />
    </AuthShell>
  );
}
