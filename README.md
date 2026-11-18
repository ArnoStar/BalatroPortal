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
| `/casino/` | the casino: players stake their items, live | BalatroCasino |
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
| `/account` | display name, profile picture (BalatroSocial: cut square and sent at 256 x 256; friends and the chat show it), in the game (private profile; "unlock everything" for testers, developers and admins), sign-in methods (link or unlink Google, set a password), log out (everywhere), delete the account |
| `/players/:id`, `/players/me` | a player's profile: their stats, collection (what they have discovered and unlocked, stakes won by deck) and recent runs (another player's: finished ones), each with *Watch* (`/play/?watch=<id>`). A private profile shows only the name. Leaderboard names link here |
| `/stats` | the player's statistics, like the game's Profile > Stats: high scores, career stats, the last 30 days, poker hands, decks, jokers, consumables, vouchers |
| `/leaderboards` | best hand, highest ante and round, most money, bosses in a row and wins, by deck and stake; then everyone's runs together |
| `/admin` | accounts and their roles (admins only): find accounts, tick roles (`admin`, `developer`, `tester`); the identity service checks and records it |
| `/bugs`, `/bugs/:id` | the bug reports players sent from the game (developers only: the developer or admin role): the player's words, the screenshot, where they were, the errors, the game's recording as a timeline (API calls with their request ids, actions, states, inputs), notes, close/reopen, download, and *Replay it in the game* (`/play/?report=<id>`) |
| `/casino/` | not a page here: the casino is its own app (BalatroCasino); the sidebar, the inventory and the items' histories link to it, and its old address (`/casino?tab=`) lands there |
| `/inventory`, `/item/:id` | the player's items (BalatroItemService, `/items/`): the game's cards (jokers, tarot, planet and spectral cards, playing cards with their enhancement and seal) with their edition, drawn with the game's sprites; their coins and this week's, *Look for new coins*, the packs waiting; an item's number, odds and value, where it came from, its history (trades, the casino, the market), *Show it on your title screen*, and *Sell it on the market* (or buy it, or take it off) |
| `/shop` | the boosters coins buy: each kind of card in three tiers (standard, boosted, premium) and three sizes (normal: 1 of 2, jumbo: 1 of 4, mega: 2 of 4), with their chances; a pack opened (`?pack=`: torn open, its cards turned over, the player chooses), the packs waiting, how coins are earned, the coins' history |
| `/market` | items players sell, for coins: search by name, kind, rarity, edition, cheapest or newest first, *Buy*; *Sell an item* (a price, its value, what the same card sold for); the player's items for sale (*Take it off*) and what they sold and bought |
| `/trades`, `/trades/new` | offers made to the player and theirs: accept, decline, cancel; a new offer to a player (found by name, or from their profile or an item), their items for yours |
| `/friends`, `/friends/add/:code` | friends (BalatroSocial, `/social/`): who is online and what they play, *Message*, remove, block; requests waiting (accept, decline, take back); finding players by name or friend code; the player's friend code and invite link (`/friends/add/<code>` shows the inviting player, with *Add friend*), who may send them requests and whether friends see them online; blocked players; *Among friends*: the bests of the player and their friends (their public profiles) |
| `/chat`, `/chat/:id` | direct conversations and groups of friends, live (the social service's event stream): messages, read receipts, "… is writing", unread counts (also in the sidebar), muting; sharing a run (a card with its deck, stake, ante, best hand and seed: *Watch*, *Play this seed*) or a seed; groups: rename, add friends, remove (the owner), leave. The home page's runs have *Share* too |

`/stats` and `/leaderboards` need a signed-in player, unless the API runs
without sign-in (`GET /api/v1/health` says `"auth": "off"`). The numbers come
from the API (`/stats/me`, `/leaderboards/{board}`, `/stats/global`); the
portal only shows them. As in the game, runs with a chosen seed and
challenges don't count. The charts are plain HTML and CSS
(`shared/ui/charts.tsx`): one hue each, values at the bar tips, tooltips on
hover and keyboard focus, and a table view; shares (the collection, win rates)
are meters and rings.

## Languages

English and Russian. The language is the site's: the game's settings keep it
(`localStorage['balatro-fe.settings'].language`, `shared/i18n/language.ts`,
the same file as BalatroCasino's), so the portal, the casino and the game speak
the same one; the first time, the browser's. The globe next to *Search*
changes it.

Text is written in English where it is shown, through `shared/i18n`:
`t('Your runs')`, `t('Hello, {name}', { name })`, `tp(n, '# run', '# runs')`
(a number and its word), `tx('Read {link}', { link: <a/> })` (elements in a
sentence), and `N_('...')` for a text kept in a table and translated later.
`src/shared/i18n/messages/ru.ts` maps each English text to its Russian (plural
forms as `Intl.PluralRules` names them); `npm run i18n` lists what a language
lacks and fails the checks then. Numbers and dates follow the language
(`fmt_number`, `fmt_date`, `time_ago` ...). The names of decks, stakes, cards,
hands and challenges are the game's own translations
(`/play/localization/<language>.json`, `game_name`), and the services' errors
are translated by their code (`describe`). A new language: its file in
`messages/`, a line in `LANGUAGES`, and the game's key for it.

## Profile pictures

Every name of a player comes with their picture (`<Avatar player={id}>`):
the pictures a page needs are looked up together (one request to the social
service's public `GET /social/v1/avatars?ids=`), and the social provider keeps
yours and your friends' up to date, so a new picture shows everywhere at once.

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
  app/        entry point, the router (with the sign-in guard), the styles (app/styles, below)
  pages/      home (the hero; a visitor's landing or a player's dashboard and runs, each with
              Share), stats, leaderboards (and everyone's stats), players, inventory, item, trades,
              new-trade, friends,
              chat, bugs, bug, admin, account, not-found; auth/ (a group: login, register,
              confirm-email, forgot-password, reset-password, auth-callback)
  widgets/    layout (the sidebar, a drawer on narrow screens, the search palette, the WebGL
              backdrop, the footer), run-card, auth-shell (the sign-in pages' layout)
  features/   auth: the sign-in forms, Google, the callback, the email codes
  entities/   session: the signed-in player (React context); catalog: the game's
              names for decks, stakes, cards (from the API's catalog), and a deck's
              glyph; item: an item drawn with the game's sprites, and its card; social:
              friends, conversations and requests kept live by the social service's event
              stream (SocialProvider, mounted by the app for a signed-in player)
  shared/     api (identity, game API, items, reports, social, the game's text, session, problem details),
              config (URLs), i18n (languages, the dictionaries, formats), lib (number and time formats),
              ui (icons, buttons, panels,
              page headers, fields, the segmented control, avatars, charts, counting
              numbers, the pointer tilt, the hand of cards)
```

Steiger asks for a slice only once two places use it. The runs list and the
account forms therefore live in their pages for now. Move them to
`widgets`/`features`/`entities` when another page needs them, for example a
leaderboard that shows runs.

## Look and feel

The portal has its own look, a night-time card room: deep violet ink, glass
panels, and the game's two forces as the brand, Chips (blue) times Mult (red).
Gold is money and first place, green a win. The game's own art appears only
where it is the subject (the items, drawn with the game's sprites); the hand of
cards, the deck glyphs and the backdrop are the portal's.

- **Styles** live in `src/app/styles/`, imported in order by `index.css`:
  `tokens.css` (colours, type, shape, motion: change the look there first),
  `base.css`, `layout.css` (the shell), `components.css` (the shared pieces),
  `cards.css`, one file per part of the site (`home`, `auth`, `play`, `items`,
  `staff`, `social`), and `motion.css` last.
- **Type** is self-hosted (Fontsource, no request to a font service): Inter for
  text and numbers, Unbounded for titles, JetBrains Mono for seeds and hashes.
- **The backdrop** is a small WebGL shader (`widgets/layout/ui/backdrop.tsx`):
  drawn at 40% of the screen's resolution, 30 frames a second, paused in a
  hidden tab, one still frame with reduced motion, and the CSS gradients
  without WebGL.
- **Movement** follows the player: pages cross-fade (React Router's view
  transitions), panels rise as they scroll into view, numbers count up, cards
  tilt toward the pointer, and items found are dealt face down and turned
  over. With `prefers-reduced-motion` all of it stands still
  (`motion.css`), and results show at once.
- **Search**: Ctrl K (⌘ K) or `/` opens a palette of every page the player can
  open.
- **Charts** follow the dataviz rules: one hue per chart, thin marks, values in
  the text colours, a table view.

## Checks

```
npm run typecheck
npm run lint        # Steiger (FSD rules)
npm run i18n        # every text translated
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

The Docker image's nginx takes `GAME_UPSTREAM`, `API_UPSTREAM`,
`IDENTITY_UPSTREAM`, `REPORTS_UPSTREAM`, `ITEMS_UPSTREAM` and `SOCIAL_UPSTREAM`,
which are origins (`http://host:port`), and `RESOLVER` (Docker's DNS by
default). `/social/` is passed on unbuffered, for its event stream (and with
`X-Accel-Buffering: no`, so that an nginx in front of it doesn't buffer it either).

## Deployment

`.github/workflows/ci-cd.yml` checks every push and pull request on `main` and
`dev`: typecheck, Steiger, build, and the Docker image. A push to `main`
deploys like the other repositories: `.github/deploy.sh` copies the code to
`DEPLOY_PATH/BalatroPortal`, and BalatroFrontEnd's `docker-compose.yml`
rebuilds the `portal` service. The secrets are the same `DEPLOY_*` as the
other repositories; see BalatroFrontEnd's README, "Deployment".
