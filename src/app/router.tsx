import { createBrowserRouter, Navigate, Outlet, useLocation } from 'react-router';
import { useSession } from '@/entities/session';
import { Layout } from '@/widgets/layout';
import { AccountPage } from '@/pages/account';
import { AdminPage } from '@/pages/admin';
import { AuthCallbackPage } from '@/pages/auth-callback';
import { BugPage } from '@/pages/bug';
import { BugsPage } from '@/pages/bugs';
import { ConfirmEmailPage } from '@/pages/confirm-email';
import { ForgotPasswordPage } from '@/pages/forgot-password';
import { HomePage } from '@/pages/home';
import { LeaderboardsPage } from '@/pages/leaderboards';
import { LoginPage } from '@/pages/login';
import { NotFoundPage } from '@/pages/not-found';
import { RegisterPage } from '@/pages/register';
import { ResetPasswordPage } from '@/pages/reset-password';
import { StatsPage } from '@/pages/stats';
import { game_api } from '@/shared/api';
import { use_async } from '@/shared/lib';
import { Spinner } from '@/shared/ui';

/** pages for signed-in players only: the others go to the sign-in, and come back */
function RequireSignIn() {
  const { status } = useSession();
  const location = useLocation();
  if (status === 'loading') return <Spinner />;
  if (status === 'signed-out') {
    return <Navigate to={`/login?${new URLSearchParams({ next: location.pathname + location.search })}`} replace />;
  }
  return <Outlet />;
}

/** pages that ask the game API for the player: signed-in players, or anyone when
 *  the API runs without sign-in (everyone is the same player) */
function RequirePlayer() {
  const { status } = useSession();
  const health = use_async(() => game_api.health(), []);
  if (status === 'signed-out' && health.loading) return <Spinner />;
  if (status === 'signed-out' && health.data?.auth === 'off') return <Outlet />;
  return <RequireSignIn />;
}

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'register', element: <RegisterPage /> },
      { path: 'confirm', element: <ConfirmEmailPage /> },
      { path: 'forgot', element: <ForgotPasswordPage /> },
      { path: 'reset', element: <ResetPasswordPage /> },
      { path: 'auth/callback', element: <AuthCallbackPage /> },
      {
        element: <RequireSignIn />,
        children: [
          { path: 'account', element: <AccountPage /> },
          // admins' (the identity service refuses everyone else)
          { path: 'admin', element: <AdminPage /> },
        ],
      },
      {
        element: <RequirePlayer />,
        children: [
          { path: 'stats', element: <StatsPage /> },
          { path: 'leaderboards', element: <LeaderboardsPage /> },
          // the developers' (the report service refuses everyone else)
          { path: 'bugs', element: <BugsPage /> },
          { path: 'bugs/:id', element: <BugPage /> },
        ],
      },
      // (the game is at /play/: a link there leaves the portal)
      { path: 'play/*', element: <Navigate to="/" replace /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
