// The portal: everything of the site that isn't the game (sign-in, account,
// runs; later leaderboards and lobbies). See README.md.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/inter';
import '@fontsource-variable/jetbrains-mono';
import '@fontsource-variable/unbounded';
import { RouterProvider } from 'react-router';
import type { ReactNode } from 'react';
import { SessionProvider, useSession } from '@/entities/session';
import { SocialProvider } from '@/entities/social';
import { I18nProvider } from '@/shared/i18n';
import { router } from './router';
import './styles/index.css';

/** friends and chat, for a signed-in player */
function Social({ children }: { children: ReactNode }) {
  const { status } = useSession();
  return <SocialProvider enabled={status === 'signed-in'}>{children}</SocialProvider>;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SessionProvider>
      <Social>
        <I18nProvider>
          <RouterProvider router={router} />
        </I18nProvider>
      </Social>
    </SessionProvider>
  </StrictMode>,
);
