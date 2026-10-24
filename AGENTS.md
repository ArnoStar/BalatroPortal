# AGENTS.md

Rules for anyone, human or agent, changing this repository. `README.md`
describes the portal; this file says how to work on it.

## What this project is

The part of Balatro in the browser that isn't the game: accounts, the
player's runs, and later leaderboards, lobbies and the multiplayer modes'
menus. It is also the site's front door. The game is BalatroFrontEnd, served
at `/play/` on the same origin.

## Non-negotiable rules

1. **No game here, and no game rules.** Anything drawn with the game's engine,
   or deciding anything about a run, belongs to BalatroFrontEnd (drawing) or
   BalatroWebAPI and BalatroEngine (rules). The portal shows what the services
   return.
2. **One origin.** The portal, the game, `/api/` and `/identity/` share an
   origin, so the session is shared and no CORS is needed. A new service gets
   a path in `docker/nginx.conf.template` and in `vite.config.ts`'s proxy, not
   its own origin.
3. **The session contract is shared with the game.** `src/shared/api/session.ts`
   has a twin in BalatroFrontEnd. Change both together, and the identity
   service's `docs/integration.md` too. Refresh only through `refresh_session`,
   which holds the cross-tab lock.
4. **No open redirect.** Every `next` goes through `safe_next` (a path on this
   site).
5. **Secrets stay out of URLs and storage.** Tokens live only in the session
   entry. A password stays in memory only. OAuth codes are used once (see the
   guard in `OAuthCallback`).
6. **Errors are the services' problem details.** Show `describe(error)`, and
   switch on `error.code` (stable), never on the message.

## Architecture (Feature-Sliced Design)

```
app  →  pages  →  widgets  →  features  →  entities  →  shared
```

A layer imports only the layers to its right. Slices of one layer don't
import each other, and every slice exposes its public API in `index.ts`.
`npm run lint` (Steiger) enforces this. A slice is created when a second place
needs it; until then the code stays in the page that uses it (Steiger's
`insignificant-slice`).

- `shared/api`: the only place that calls `fetch`. The identity service is
  `identity`, the game API `game_api`.
- `shared/config`: the other apps' URLs.
- `entities/session`: who is signed in. Everything else reads it with
  `useSession()`.

## Conventions

- TypeScript strict. Functions and variables use snake_case like the game,
  except React components and hooks.
- Styling: `src/app/styles/index.css`, with the game's colours as CSS
  variables. Components use its classes (`btn btn--blue`, `panel`, `field`).
  Respect `prefers-reduced-motion`, keep labels on every input, and make
  focus visible.
- Text addresses the player plainly ("Sign in", "Your runs").

## Commands

```
npm install
npm run dev         # (make run) :5174, with the game on :5173, the API on :8000, the identity service on :8001
                    # (BalatroFrontEnd's `make dev` runs them all)
npm run check       # (make check) typecheck + lint
npm run typecheck
npm run lint
npm run build
```

All three checks must pass before committing. Don't commit or push unless
asked.
