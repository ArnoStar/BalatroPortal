# BalatroPortal

Everything of Balatro in the browser that isn't the game: signing in,
creating an account, confirming an email, resetting a password, Google
sign-in, the account page, the list of your runs, your statistics and the
leaderboards. Lobbies and the duel and co-op modes will come here too. The game itself is
[BalatroFrontEnd](../BalatroFrontEnd).

It is also the site's **front door**. Everything is served from one origin, so
the portal and the game share the player's session:

| Path | What | From |
|---|---|---|
| `/` | the portal (this app) | |
| `/play/` | the game | BalatroFrontEnd |
| `/api/` | the game API | BalatroWebAPI |
| `/identity/` | accounts and tokens | BalatroIndentityService |

In production, the portal's nginx passes the other paths on
(`docker/nginx.conf.template`). In development, its Vite server does
(`vite.config.ts`).

React 19, React Router 7, TypeScript and Vite, organised with
[Feature-Sliced Design](https://feature-sliced.design), like the game.

## Run it

You need Node 20+, and the services it talks to:

```
cd ../BalatroIndentityService && make services && make run    # :8001
cd ../BalatroWebAPI && BALATRO_API_AUTH_JWKS_URL=http://127.0.0.1:8001/.well-known/jwks.json \
    BALATRO_API_AUTH_ISSUER=http://localhost:8001 uv run balatro-api   # :8000
cd ../BalatroFrontEnd && npm run dev                          # the game, :5173
npm install && npm run dev                                    # the portal, :5174
```

Or all of it at once: `make dev` in BalatroFrontEnd. That runs the identity
service, the API, the game and this portal from their repositories, with
their logs together. Here, `make run` is `npm run dev`, and `make` lists the
other commands.

Open **http://localhost:5174**. The game is at http://localhost:5174/play/:
open it through the portal, so that both share the session. Opened directly
on 5173, the game has no portal to send you to for signing in.

The confirmation and reset codes are in the identity service's output, with
its default `EMAIL_BACKEND=console`.

Google sign-in (*Continue with Google*, and *Link Google* on the account page)
appears once the identity service has a Google client id and secret. Its
README, "Google sign-in", explains how to get them. For development, register
`http://localhost:5174/auth/callback` as a redirect URI.

`BALATRO_GAME`, `BALATRO_API` and `BALATRO_IDENTITY` change where the dev
server sends `/play`, `/api` and `/identity`.

To run everything in Docker instead, use `docker compose up --build` in
BalatroFrontEnd, then open http://localhost:8087.

## Pages

| Path | |
|---|---|
| `/` | Play; the player's runs (with sign-in) |
| `/login?next=` | email and password, or Google; then `next` (a path on this site, such as the game's `/play/`) |
| `/register?next=` | display name, email, password; then the code |
| `/confirm?email=&next=` | the emailed code; signs in at once when the password is still in memory |
| `/forgot`, `/reset?email=` | a reset code, then a new password |
| `/auth/callback` | where Google sends the browser back (one of the identity service's `OAUTH_REDIRECT_URIS`) |
| `/account` | display name, sign-in methods (link or unlink Google, set a password), log out (everywhere), delete the account |
| `/stats` | the player's statistics, like the game's Profile > Stats: high scores, career stats, the last 30 days, poker hands, decks, jokers, consumables, vouchers |
| `/leaderboards` | best hand, highest ante and round, most money, bosses in a row and wins, by deck and stake; then everyone's runs together |
| `/admin` | accounts and their roles (admins only): find accounts, tick roles (`admin`, `developer`, `tester`); the identity service checks and records it |
| `/bugs`, `/bugs/:id` | the bug reports players sent from the game (developers only: the developer or admin role): the player's words, the screenshot, where they were, the errors, the game's recording as a timeline (API calls with their request ids, actions, states, inputs), notes, close/reopen, download, and *Replay it in the game* (`/play/?report=<id>`) |

`/stats` and `/leaderboards` need a signed-in player, unless the API runs
without sign-in (`GET /api/v1/health` says `"auth": "off"`). The numbers come
from the API (`/stats/me`, `/leaderboards/{board}`, `/stats/global`); the
portal only shows them. As in the game, runs with a chosen seed and
challenges don't count. The charts are plain HTML and CSS
(`shared/ui/charts.tsx`): one hue each, values at the bar tips, tooltips on
hover and keyboard focus, and a table view.

## The session

`src/shared/api/session.ts` keeps the tokens in `localStorage['balatro.session']`.
It refreshes them under a lock shared by every tab, and retries a request once
after a refresh when a service answers 401. The game has the same file, so
**keep the two in step**. The identity service's
[docs/integration.md](../BalatroIndentityService/docs/integration.md) describes
the contract.

A password the player just typed is kept only in memory between registering
and entering the code (`features/auth/model/pending.ts`), never in the URL or
the history.

## Code

```
src/
  app/        entry point, the router (with the sign-in guard), global styles
  pages/      home (and the runs list), stats, leaderboards (and everyone's stats), bugs, bug, admin,
              login, register, confirm-email, forgot-password, reset-password,
              auth-callback, account, not-found
  widgets/    layout (header, navigation, footer)
  features/   auth: the sign-in forms, Google, the callback, the email codes
  entities/   session: the signed-in player (React context); catalog: the game's
              names for decks, stakes, cards (from the API's catalog)
  shared/     api (identity, game API, session, problem details), config (URLs),
              lib (number formats), ui (buttons, fields, panels, charts in the
              game's colours)
```

Steiger asks for a slice only once two places use it. The runs list and the
account forms therefore live in their pages for now. Move them to
`widgets`/`features`/`entities` when another page needs them, for example a
leaderboard that shows runs.

## Checks

```
npm run typecheck
npm run lint        # Steiger (FSD rules)
npm run build
```

## Configuration

Build-time variables (`VITE_*`). They are empty by default, which means the
same origin:

| Variable | Default | |
|---|---|---|
| `VITE_API_URL` | `` | the game API's base (`<base>/api/v1/...`) |
| `VITE_IDENTITY_URL` | `/identity` | the identity service |
| `VITE_GAME_URL` | `/play` | the game |

The Docker image's nginx takes `GAME_UPSTREAM`, `API_UPSTREAM` and
`IDENTITY_UPSTREAM`, which are origins (`http://host:port`), and `RESOLVER`
(Docker's DNS by default).

## Deployment

`.github/workflows/ci-cd.yml` checks every push and pull request on `main` and
`dev`: typecheck, Steiger, build, and the Docker image. A push to `main`
deploys like the other repositories: `.github/deploy.sh` copies the code to
`DEPLOY_PATH/BalatroPortal`, and BalatroFrontEnd's `docker-compose.yml`
rebuilds the `portal` service. The secrets are the same `DEPLOY_*` as the
other repositories; see BalatroFrontEnd's README, "Deployment".
