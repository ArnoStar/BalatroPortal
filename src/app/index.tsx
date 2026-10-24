// The portal: everything of the site that isn't the game (sign-in, account,
// runs; later leaderboards and lobbies). See README.md.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { SessionProvider } from '@/entities/session';
import { router } from './router';
import './styles/index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SessionProvider>
      <RouterProvider router={router} />
    </SessionProvider>
  </StrictMode>,
);
