# Fantasy Football Center — Design

> Source of truth for decisions, architecture, security and milestones.
> Code implements this document; change the doc in the same commit as the code.
> Status: **planning** (nothing built yet).

## 1. What it is

A web "command center" for every fantasy league a person plays in, across
providers. Football first, basketball later.

**v1 features**

| #   | Feature               | Summary                                                                                                     |
| --- | --------------------- | ----------------------------------------------------------------------------------------------------------- |
| F1  | My leagues            | Link a Sleeper username and/or a Yahoo account and see every league for the season in one list.             |
| F2  | Matchups              | My matchup per league for the selected week, plus every matchup league-wide. Live-ish refresh during games. |
| F3  | League analysis       | Standings plus power rankings, all-play record, luck index, points for/against and positional strength.     |
| F4  | Trade calculator      | Pick players (and later picks) on each side; see value delta and how each starting lineup changes.          |
| F5  | Trade recommendations | Suggest trades that improve _both_ lineups, based on my surplus and their need.                             |
| F6  | Win celebration       | An animation the first time I open the app after winning a matchup that week.                               |

**Audience:** me plus a few friends. **Form factor:** web app, installable as
a PWA on phones. **Hosting:** managed free tier.

**Non-goals for v1:** making moves on the provider (trades, waivers, lineup
changes); native apps; ESPN, MFL, Fleaflicker, CBS and NFL.com (the provider
interface is built so they can be added later); public sign-up.

## 2. Decisions

| #   | Area                 | Decision                                                                                                                                                                                                                              | Why                                                                                                                                                                                                                                             | Alternatives considered                                                                                                 |
| --- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| D1  | Language             | TypeScript (strict) end to end                                                                                                                                                                                                        | One language for UI, server, analysis and tests; provider types are shared.                                                                                                                                                                     | Python backend for analysis: better data libraries, but two languages and contract drift for little gain at this scale. |
| D2  | Repo shape           | pnpm workspaces + Turborepo monorepo                                                                                                                                                                                                  | Packages with enforced boundaries (§4); Turbo caches lint/test/build per package. A native app could reuse `domain` and `analysis` later.                                                                                                       | Single Next.js app: simpler at first, but boundaries rot.                                                               |
| D3  | App framework        | Next.js (App Router, current major), React 19                                                                                                                                                                                         | Server code is needed anyway: Yahoo OAuth needs a client secret, provider calls need caching and rate limiting, and some providers block browser CORS. Route handlers + server components keep that server side. Vercel-native preview deploys. | Vite SPA + separate API (Hono/Fastify): two deployables. Remix/React Router 7: fine too, smaller hosting story.         |
| D4  | Styling / components | Tailwind CSS v4 + shadcn/ui (Radix primitives)                                                                                                                                                                                        | Accessible primitives; components are copied into our repo, so no runtime lock-in. Design tokens as CSS variables.                                                                                                                              | MUI / Chakra: heavier, harder to theme.                                                                                 |
| D5  | Client data          | Server components render all data; live weeks re-render with `router.refresh()` on an interval (`LiveRefresh`), paused while the tab is hidden. TanStack Query was the plan; M2 didn't need a client cache.                           | The server already caches provider calls (§3.2), so a refresh is one cheap round trip and keeps a single data path. Revisit if client-side mutations or optimistic updates arrive.                                                              | TanStack Query / SWR: a second cache and fetch layer for no gain yet.                                                   |
| D6  | Validation           | Zod at every boundary (env, provider responses, route input)                                                                                                                                                                          | Provider APIs are unofficial or loosely typed; parse into domain types or reject (§8).                                                                                                                                                          | io-ts / valibot: fine; Zod has the widest ecosystem.                                                                    |
| D7  | Database             | Postgres via Drizzle ORM + drizzle-kit migrations: Neon (HTTP driver) on Vercel, PGlite (in-process, WebAssembly) for local development and tests.                                                                                    | Stores users, linked accounts, encrypted Yahoo tokens, cached snapshots, celebration-seen flags. Drizzle is typed SQL with no codegen step.                                                                                                     | Supabase: also fine. SQLite/Turso: works, less standard on Vercel. Prisma: heavier, binary engine.                      |
| D8  | Auth (app sign-in)   | Better Auth, invite-only (Google or email magic link)                                                                                                                                                                                 | Small friend group, no passwords stored by us. Yahoo linking is a separate OAuth "connection", not the app login.                                                                                                                               | Auth.js: now maintained by the Better Auth team. Clerk: hosted, good, but external dependency for user data.            |
| D9  | Providers in v1      | Sleeper (username, public API) and Yahoo (OAuth 2.0, read-only scope)                                                                                                                                                                 | User's leagues are on these. Each sits behind one `FantasyProvider` interface (§5).                                                                                                                                                             | ESPN later: needs `espn_s2`/`SWID` cookies for private leagues.                                                         |
| D10 | Player values        | Our own value model in `analysis`: points-per-game / rest-of-season projection → value over replacement (VORP) using **each league's** roster and scoring settings. Optional external market values behind a `ValueSource` interface. | Owning the model avoids licensing problems and adapts to custom scoring. External sources (e.g. FantasyCalc) only after checking their terms. Never scrape sites without an API (e.g. KeepTradeCut).                                            | Only external values: easy but generic, and ToS risk.                                                                   |
| D11 | Animation            | `canvas-confetti` (ISC, no dependencies) for the win burst; a CSS keyframe (`animate-pop-in`) for the banner; durations in `packages/ui/src/celebration/timings.ts`. Motion was planned and dropped in M2.                            | Motion renders initial `style` attributes on the server, which the nonce CSP blocks. canvas-confetti styles its canvas from script (allowed) and runs with `useWorker: false` (no blob: worker). `prefers-reduced-motion` → banner only.        | Motion: CSP conflict. Lottie: needs designed assets.                                                                    |
| D12 | Testing              | Vitest, fast-check (property tests), synthetic fixtures served through an injected HTTP function (§5.2; replaced MSW in M1), Playwright for E2E                                                                                       | Fast unit tests in every package; providers tested against real-shaped data without network.                                                                                                                                                    | Jest: slower, ESM pain.                                                                                                 |
| D13 | Lint / format        | ESLint 9 flat config + typescript-eslint (strict, type-aware) + eslint-config-next for the app; Prettier; warnings fail CI. Layer rules are tests in `tooling/repo-checks` (§4).                                                      | Layer rules are enforced by tooling, not discipline. A small import-scanning test replaced `eslint-plugin-boundaries` in M0: no resolver plugins, and it also checks `package.json` declarations and purity.                                    | Biome: fast, but no Next.js rules.                                                                                      |
| D14 | Hosting              | Vercel (Hobby) for the app; Neon for Postgres; Vercel Cron for daily jobs                                                                                                                                                             | Free, preview deploy per PR through the Vercel GitHub app, so **no deploy token is stored in GitHub**. Secrets live in Vercel env settings.                                                                                                     | Docker on a VPS: more control, more upkeep.                                                                             |
| D15 | CI/CD                | GitHub Actions (checks) + Vercel Git integration (deploys)                                                                                                                                                                            | CI never needs production secrets. Details §10.                                                                                                                                                                                                 | Deploying from Actions with a Vercel token: one more secret to guard.                                                   |
| D16 | Runtime              | Node.js 24 LTS (supported to April 2028), pinned in `.nvmrc` and `engines` (root and `apps/web`); pnpm pinned via `packageManager`. Moving to Node 26 LTS is a planned, deliberate upgrade, not automatic.                            | Same toolchain locally, in CI and on Vercel.                                                                                                                                                                                                    | —                                                                                                                       |
| D17 | Sports               | Sport is data, not a code path: a sport registry in `domain` (positions, lineup slots, scoring kind)                                                                                                                                  | Basketball later means adding registry entries and provider mappings, not forking features. NBA leagues often use **category** scoring, so the domain supports `points` and `categories` from day one (§5.3).                                   | Football-only types: basketball becomes a rewrite.                                                                      |

Exact package versions live in `package.json` files and the lockfile, not in
this document. Version ceilings chosen deliberately in M0 (each has a matching
Dependabot `ignore` with the reason):

- **pnpm 10** (not 12): settled behaviour; revisit as a planned upgrade.
- **ESLint 9** (not 10): eslint-config-next's plugins (react, import, jsx-a11y)
  only support ESLint 9. ESLint 9 is out of upstream support, which is
  acceptable for a dev-only tool; move to 10 when eslint-config-next does.
- **TypeScript 6** (not 7): typescript-eslint supports TypeScript < 6.1.
- **Node 24 LTS** with matching `@types/node` 24. `.nvmrc` is the source;
  `engines.node` is `24.x` in the root **and** in `apps/web/package.json`,
  because Vercel reads `engines` from the Root Directory (`apps/web`), not
  the repo root. Without the app-level pin Vercel uses its default Node, and
  `engine-strict` makes `pnpm install` fail (seen on the first deploy).
  `tooling/repo-checks/src/toolchain.test.ts` keeps all pins equal to
  `.nvmrc`.
- `minimatch` is overridden to 11.0.8 (`pnpm.overrides`) to clear
  GHSA-g3hv-75wg-m249 in a lint-only dependency path. Drop the override when
  upstream moves.
- `esbuild` below 0.25 is overridden to 0.25.12 to clear GHSA-67mh-4wv8-2f99
  (dev-server request issue) in drizzle-kit's old `@esbuild-kit` loader,
  which is development-only and never runs esbuild's server. Verified
  `drizzle-kit generate` still reads the schema. Drop it when drizzle-kit
  stops depending on `@esbuild-kit`.

## 3. Architecture

```
 Browser (PWA)                       Vercel (Next.js server)                     External
┌──────────────┐  HTTPS, session ┌───────────────────────────────────┐        ┌────────────────┐
│ React UI     │────cookie──────▶│ edge: route handlers / server     │──────▶ │ Sleeper API    │
│ TanStack     │                 │       actions (validate → call    │ fixed  │ (public)       │
│ Query cache  │◀────JSON────────│       one feature → map errors)   │ base   ├────────────────┤
│ Celebration  │                 │ features: leagues, matchups,      │ URLs   │ Yahoo Fantasy  │
└──────────────┘                 │   analysis, trades, linking       │──────▶ │ API (OAuth)    │
                                 │ providers ── cache ── db          │        └────────────────┘
                                 └───────────────┬───────────────────┘
                                                 │ TLS
                                          ┌──────▼──────┐
                                          │ Neon        │
                                          │ Postgres    │
                                          └─────────────┘
```

All provider calls happen on the server. The browser only talks to our app.

### 3.1 Data flow (example: "show my matchups for week 9")

1. UI asks `/api/matchups?week=9`. Edge validates `week` against the sport
   registry and gets the session user.
2. `features/matchups` loads the user's linked accounts from `db`, asks each
   provider adapter for leagues and matchups, through the snapshot cache.
3. Adapters fetch, validate with Zod and map raw JSON to domain types.
4. `analysis` (pure) derives status (`upcoming | live | final`), winner and
   margins.
5. The response is domain types only, never raw provider JSON.

### 3.2 Caching and freshness

One cache policy table in `packages/config` (not inline TTLs):

| Data                                            | TTL                                         | Notes                                                     |
| ----------------------------------------------- | ------------------------------------------- | --------------------------------------------------------- |
| Player database (Sleeper `/players/nfl`, ~5 MB) | 24 h, refreshed by daily cron into Postgres | Sleeper asks that this be fetched at most once a day.     |
| User → leagues                                  | 6 h                                         | Changes rarely in season.                                 |
| League settings, rosters                        | 15 min                                      |                                                           |
| Matchups, during games                          | 60 s                                        | Client polls; server cache dedupes all users of a league. |
| Matchups, otherwise                             | 1 h                                         |                                                           |
| NFL state (current week)                        | 15 min                                      |                                                           |

## 4. Repository layout and layers

```
apps/
  web/                    Next.js app (edge + composition only)
    src/app/              routes, layouts, route handlers (thin)
    src/features/         server-side feature functions
      provider-access/    adapter wiring (cache, request cap) + error → result
      leagues/ matchups/  one folder per feature; later: analysis/ trades/ linking/
    src/state/            client state (e.g. which wins were celebrated)
    src/components/       presentational components (props in, callbacks out)
packages/
  domain/                 PURE. Types + Zod schemas: Sport registry, League,
                          Team, Roster, Player, Matchup, Trade. No I/O.
  analysis/               PURE. Standings, power rankings, all-play, luck,
                          lineup optimizer, VORP, trade evaluator, recommender.
  providers/              I/O. FantasyProvider interface + sleeper/ + yahoo/.
                          Raw schemas, mappers raw → domain, HTTP client.
  db/                     I/O. Drizzle schema, migrations, repositories,
                          token encryption. (Created in M3.)
  config/                 Typed env parsing, cache policy, limits, timings,
                          provider base URLs. Only place that reads process.env.
  ui/                     Design-system components and the celebration
                          animation (no data fetching).
tooling/
  tsconfig/               Shared compiler settings.
  repo-checks/            Tests that enforce this section and §9.
.github/                  Workflows, Dependabot, ruleset JSON.
eslint.config.mjs         One lint config for the whole repo.
```

Packages are created when their first real code lands, not as empty shells.

**Dependency direction.** The allowed-dependency table lives in one place,
`tooling/repo-checks/src/layers.ts`, and `layers.test.ts` fails when:

- a package declares or imports an internal package its row doesn't allow;
- a source file imports an internal package it hasn't declared, or deep-imports
  past a facade (`@ffc/x/src/...`);
- a relative import leaves its package folder;
- `domain` or `analysis` import Node built-ins, Next.js or React, or use
  `fetch`, `process`, `Date.now`, `new Date()` or `Math.random`;
- any package other than `config` mentions `process.env`.

```
domain ← analysis
domain ← config ← providers
domain ← config ← db
apps/web/features → analysis, providers, db, config, domain
apps/web/app (edge) → features
apps/web/components → ui, domain (types only)
```

- `domain` and `analysis` never import I/O packages, Next.js, `fetch`, the
  clock or `Math.random`; time and randomness are passed in. This makes the
  trade engine and analysis fully unit- and property-testable.
- Each package exposes one `src/index.ts` facade through `exports`; deep
  imports across packages fail the repo check.
- Workspace packages ship TypeScript source; the app compiles them through
  Next.js `transpilePackages`, so there is no per-package build step.
- No `utils/` or `helpers/` folders: name modules after what they do.

## 5. Domain model and provider interface

### 5.1 Core types (in `packages/domain`)

- `Sport` (`nfl`, later `nba`), via a **sport registry**: positions, lineup
  slot kinds (e.g. `FLEX` accepts RB/WR/TE), week range, scoring kind.
- `ProviderId` (`sleeper`, `yahoo`): one enum, used everywhere.
- `LeagueRef { provider, leagueId, season, sport }`: the stable cross-provider
  key. All IDs are opaque strings, namespaced by provider.
- `League` (settings: roster slots, scoring rules, playoff weeks), `Team`,
  `Roster`, `Player` (canonical id + per-provider ids), `Matchup`
  (`status: upcoming | live | final`, scores or category results, winner),
  `TradeProposal`.

### 5.2 Provider adapter

As built through M2 (`packages/providers/src/provider.ts`); later milestones add
`getTransactions`:

```ts
interface FantasyProvider {
  readonly id: ProviderId;
  readonly sports: readonly Sport[];
  currentSeason(sport: Sport): Promise<number>;
  listLeagues(user: ProviderUser, sport: Sport, season: number): Promise<PartialList<League>>;
  getLeague(ref: LeagueRef): Promise<League>;
  getTeams(ref: LeagueRef): Promise<readonly Team[]>;
  /** freshness picks the matchupsLive / matchupsIdle cache lifetime. */
  getMatchups(
    ref: LeagueRef,
    week: number,
    freshness: 'live' | 'idle',
  ): Promise<PartialList<Matchup>>;
}
/** Only providers with public usernames (Sleeper). Yahoo links by OAuth instead. */
interface UsernameLookup {
  findUser(username: string): Promise<ProviderUser>;
}
```

- **HTTP is injected.** Adapters take an `HttpGetJson` function
  (`http.ts`): the app passes one built on `fetch` with Next.js
  `revalidate` caching; tests pass `testing/fixture-http.ts`. This replaced
  MSW from D12: no request interception library is needed.
- **Errors are typed:** `ProviderNotFoundError` (unknown user/league; Sleeper
  answers these with a `null` body, not 404), `ProviderUnavailableError`
  (network, timeout, 429, 5xx) and `ProviderDataError` (wrong shape, too
  large, not JSON). Features map them to `not_found` / `unavailable`
  (`apps/web/src/features/leagues/load-result.ts`) so a provider problem
  never becomes a crash page.
- **One bad item doesn't hide the rest.** League lists are parsed item by
  item; unreadable leagues are dropped and counted (`PartialList.skipped`)
  and the page says how many were hidden. Cosmetic fields (avatars) fall
  back to null instead of failing the response.
- **Fixtures are synthetic.** `sleeper/fixtures/responses.json` copies the
  live response shapes with invented names and ids, so there is nothing to
  scrub (R1).

A **contract test suite** (`testing/provider-contract.ts`) runs the same
assertions against every adapter's fixtures: valid refs for the right
provider and season, each listed league retrievable by its ref, teams with
unique ids and finite non-negative records. Adding a provider means making
that suite pass; later milestones extend it (matchups pair up, and so on).

### 5.3 Provider notes

**Sleeper** (`api.sleeper.app/v1`, read-only, no auth)

- `GET /user/{username}` → `user_id`; `GET /user/{user_id}/leagues/nfl/{season}`.
- `GET /league/{id}`, `/rosters`, `/users`, `/matchups/{week}`,
  `/transactions/{week}`, `/traded_picks`; `GET /state/nfl` for current week.
- Matchups have no "final" flag; status is derived from `/state/nfl` and the
  week schedule in `analysis`.
- Stay well under Sleeper's stated limit (~1000 calls/min); the server cache
  makes this easy.
- Projections endpoints are undocumented: treat as optional, behind
  `ValueSource`, and degrade to season points-per-game if they change.

**Yahoo Fantasy Sports API** (`fantasysports.yahooapis.com/fantasy/v2`)

- Register an app on the Yahoo Developer Network. OAuth 2.0 authorization
  code flow, scope `fspt-r` (read-only). Access tokens last about 1 hour;
  refresh tokens are stored **encrypted** (§8, R2).
- Redirect URIs must be HTTPS and pre-registered: production URL, plus local
  HTTPS dev (`next dev --experimental-https`). Preview deploys can't do Yahoo
  OAuth unless a stable preview domain is registered. Note this in the
  development docs.
- Request `?format=json` to avoid XML parsing. The JSON is deeply nested and
  array-like; mappers live in `providers/yahoo/map-*.ts` with fixtures.
- Game keys change per season (`nfl` resolves to the current one); NBA uses
  categories (H2H) in many leagues, which is why D17 exists.

**Later:** ESPN (league ID, plus `espn_s2`/`SWID` stored encrypted for private
leagues), MFL, Fleaflicker.

## 6. Features in detail

### F1 My leagues

Link flow: Sleeper → type username → server resolves → store `{provider,
externalUserId, displayName}`. Yahoo → "Connect Yahoo" → OAuth → store
encrypted tokens. Dashboard lists leagues grouped by sport and season, with
record and rank.

### F2 Matchups

- **Week state comes from the league, not the calendar.** Each `League`
  carries `currentWeek` and `lastScoredWeek` (Sleeper's `leg` and
  `last_scored_leg`). `analysis/week.ts`: a week is `final` once scored,
  once the league has moved past it, or when the league is complete; `live`
  ("This week" in the UI, since Sleeper's week starts before kickoff) for the
  current week of an active league; otherwise `upcoming`. A property test
  checks status never goes backwards from one week to the next.
- **Week picker** (`?week=`) defaults to the league's current week, the last
  scored week once complete, else week 1. "My matchups" uses the week most
  leagues agree on.
- **"My matchups"** (`/sleeper/<username>/matchups`): one card per league in
  the current season with me vs opponent, points, status and result; leagues
  without a game say why (not started, no game, no team); one league failing
  doesn't blank the page. **League page**: every pairing for the week above
  the standings.
- **Pairing:** rosters sharing a `matchup_id` play each other; a lone roster
  or a missing id is a bye; groups of three and duplicate rosters are dropped
  and counted. A commissioner's `custom_points` overrides `points`.
- **Live updates:** while a week is live the page re-renders every
  `matchupsLive` seconds (60), paused while the tab is hidden; the server
  cache means many viewers still cost one provider call per minute.
- **Request cap:** `withConcurrencyLimit` keeps each server instance at
  `maxConcurrentRequests` per provider (8 for Sleeper).
- Not yet: projected points, co-owners (Sleeper `co_owners`), and the
  "league median" extra game some leagues play.

### F3 League analysis (pure functions in `analysis`)

- **All-play record:** my score vs every team each week.
- **Luck index:** actual wins − all-play expected wins.
- **Power ranking:** weighted blend of points for, all-play %, recent form and
  roster strength (optimal lineup VORP). Weights live in one config module.
- **Positional strength:** each team's optimal-lineup value per slot vs league
  median: the input for trade recommendations.

### F4 Trade calculator

- Input: players from team A and team B (picks later, for dynasty).
- Output per side: total value, change in **optimal starting lineup** value
  (not raw sum: 3 bench WRs for 1 star is a classic trap), positional
  before/after, fairness verdict with a configurable tolerance.
- Engine: `analysis/trades/evaluate.ts`, pure, deterministic.

### F5 Trade recommendations

- For my team vs each other team: find surplus positions (depth above starter
  needs) and need positions (below league median).
- Bounded search over 1-for-1, 2-for-1 and 2-for-2 packages from surplus ↔
  need, keeping trades where **both** lineups improve and value is within the
  fairness band. Ranked, top N per opponent.
- Search limits (candidate pool size, max packages) live in config so it stays
  inside a serverless time budget. Property tests: recommendations are always
  valid rosters, never include the same player twice, and evaluate as
  mutually beneficial with `evaluate.ts`.

### F6 Win celebration

- Trigger: "My matchups" finds a win in each league's latest **scored** week
  (`celebrationWeek`: stricter than `final`, so no celebration before
  Sleeper finishes scoring), and this browser hasn't celebrated it yet.
  Until M3 "seen" lives in `localStorage` (`apps/web/src/state/celebration-seen.ts`,
  failures mean "not seen"); M3 moves it to `celebration_seen`.
- Show once per (league, week); multiple wins → one combined celebration.
  "Replay" button on the matchup card.
- `prefers-reduced-motion` → static "You won!" banner, no confetti.
- Component lives in `packages/ui/src/celebration/`, takes `{ wins, onDone }`,
  has no data fetching. It renders only after hydration (the server can't
  know what a browser has seen), focuses its button, and closes on Escape.
  Durations come from `timings.ts`.

### 6.1 Accounts (M3a)

Decided 2026-11-11: Google sign-in only, invite-only; Neon added through
Vercel's Storage integration; production stays on
`ff-command-center-random-4df1.vercel.app` (no custom domain yet). Yahoo
moves to M3b.

- **Sign-in:** Better Auth with the Google provider and the Drizzle adapter.
  Sessions are `HttpOnly`, `Secure` (in production), `SameSite=Lax`
  cookies. Better Auth telemetry is off. Google tokens aren't needed after
  sign-in; Better Auth's OAuth-token encryption is on so the `account` table
  never holds them in plaintext.
- **Invite-only:** a user can only be created when their Google email is in
  `invite` or equals `OWNER_EMAIL`; enforced in Better Auth's
  `user.create.before` hook, so no code path can skip it. The owner manages
  invites on `/invites` (owner-only, server-checked).
- **Every page needs a session** except `/sign-in`, `/api/auth/*` and
  `/api/health`. `proxy.ts` redirects requests without a session cookie
  (a fast, optimistic check); each page and server action then validates the
  session for real (`requireUser()`), because a cookie's presence proves
  nothing. With app sign-in in place, Vercel Authentication can be turned off
  for production so friends can reach the site.
- **Linked accounts:** on `/settings` a user links a Sleeper username
  (validated against Sleeper before saving). Home then opens their matchups.
  The `/sleeper/<username>` pages stay, behind sign-in.
- **Celebration "seen"** moves from localStorage to `celebration_seen`,
  written by a server action when the banner is dismissed; the server only
  sends unseen wins.
- **Database access:** `packages/db` owns the Drizzle schema, migrations
  and repository functions. Production uses Neon's HTTP driver; local
  development and tests use PGlite (Postgres compiled to WebAssembly,
  in-process, no Docker), with local data under `.data/` (gitignored).
- **Migrations** are generated by drizzle-kit and committed. Vercel applies
  them in its build step (`packages/db` migrate script before
  `next build`), using the `DATABASE_URL` Vercel injects. Neon's
  integration gives each preview deploy its own database branch, so previews
  never migrate production. This replaces the planned `db-migrate.yml`
  GitHub workflow, so **no database secret is ever stored in GitHub**. On
  Vercel the build fails if `DATABASE_URL` is missing; CI builds without a
  database and skip migrating.

## 7. Data model (Postgres)

| Table                                        | Purpose                                                                                              | Sensitive?        |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ----------------- |
| `user`, `session`, `account`, `verification` | Better Auth's tables                                                                                 | email addresses   |
| `invite`                                     | invite-only sign-up allowlist                                                                        | email addresses   |
| `linked_account`                             | user ↔ provider identity (`provider`, `external_user_id`, `display_name`)                            | low               |
| `provider_token`                             | Yahoo access/refresh tokens, **AES-256-GCM encrypted** with key from env; key id column for rotation | **high**          |
| `snapshot_cache`                             | `key`, `payload jsonb`, `fetched_at`, `expires_at`                                                   | low (league data) |
| `player`                                     | canonical player list + per-provider ids, refreshed daily                                            | none              |
| `celebration_seen`                           | (`user_id`, `league_ref`, `week`)                                                                    | none              |

Migrations are generated by drizzle-kit, committed and reviewed, and applied
by Vercel's build step before `next build` (never by the app at runtime;
see §6.1). M3a creates the Better Auth tables, `invite`,
`linked_account` and `celebration_seen`; `provider_token` arrives with
Yahoo in M3b.

## 8. Threat model

**Assets:** Yahoo OAuth tokens and client secret; app session cookies; friends'
email addresses; DB credentials; token-encryption key; the GitHub repo's
cleanliness (public-ready at all times).

**Trust boundaries:**

1. Browser → our server (users, possibly a stolen session).
2. Provider APIs → our server. **League names, team names and avatars are
   written by other league members**, so they are untrusted content.
3. Our server → Postgres.
4. Developer machine → GitHub (what gets committed).
5. GitHub Actions → anything (what CI can reach).

**Risks and controls**

| #   | Risk                                                                        | Control                                                                                                                                                                                                                                                                                                                                                                                                      |
| --- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| R1  | Secrets or personal data committed to GitHub                                | Only `.env.example` with placeholder names is tracked; `.env*` gitignored; gitleaks in CI on every push and a scheduled full-history run; GitHub push protection; noreply commit email; fixtures scrubbed by a script and a test that fails on emails, tokens or real usernames.                                                                                                                             |
| R2  | Yahoo tokens stolen from DB                                                 | Tokens encrypted (AES-256-GCM, key only in Vercel env, key id for rotation); read-only `fspt-r` scope; DB role without DDL rights for the app; tokens never logged or sent to the browser.                                                                                                                                                                                                                   |
| R3  | XSS via league/team names from providers                                    | React escaping only; `dangerouslySetInnerHTML` banned by lint; strict CSP with nonces; Zod caps string lengths; images only from allowlisted provider hosts (`next.config` `images.remotePatterns`).                                                                                                                                                                                                         |
| R4  | SSRF / path injection via username or league ID                             | Inputs parsed to strict formats (Sleeper username charset and length, numeric IDs, Yahoo keys by regex); URLs built from fixed base URLs in `config` with `encodeURIComponent`; no user-supplied hosts ever.                                                                                                                                                                                                 |
| R5  | Our server gets rate-limited or banned by a provider; abuse of our API      | Shared server cache (§3.2); per-user rate limit on route handlers; only signed-in, invited users; outbound concurrency cap per provider.                                                                                                                                                                                                                                                                     |
| R6  | OAuth CSRF, code interception, open redirect                                | `state` + PKCE; fixed registered redirect URIs; post-login redirect only to same-origin relative paths.                                                                                                                                                                                                                                                                                                      |
| R7  | Session theft                                                               | `HttpOnly`, `Secure`, `SameSite=Lax` cookies; short sessions with rotation; CSP; no tokens in `localStorage`.                                                                                                                                                                                                                                                                                                |
| R8  | Malformed or changed provider responses crash pages or corrupt analysis     | Zod parse at the adapter; invalid → typed `ProviderError`, page shows "provider unavailable" for that league only; property tests "mapper never throws on any JSON".                                                                                                                                                                                                                                         |
| R9  | Supply-chain compromise                                                     | Lockfile with `--frozen-lockfile`; Dependabot grouped weekly; `pnpm audit` + OSV-Scanner in CI; minimal dependencies, each justified; actions pinned to SHA.                                                                                                                                                                                                                                                 |
| R10 | Over-privileged CI                                                          | Workflows `permissions: contents: read` by default; CI holds **no** production secrets (Vercel deploys through its own GitHub app); no `pull_request_target`.                                                                                                                                                                                                                                                |
| R11 | Provider terms of service                                                   | Personal, non-commercial use; read-only; attribution; respect stated rate limits; no scraping of sites without APIs. Re-check before opening to the public.                                                                                                                                                                                                                                                  |
| R12 | Someone uninvited creates an account                                        | Invite check inside Better Auth's user-create hook (every creation path runs it); integration test proves a stranger is refused; owner-only invite management re-checks the owner on every action.                                                                                                                                                                                                           |
| R13 | Server actions are public endpoints (every export of a `'use server'` file) | Each action calls `requireUser`/`requireOwner` itself and parses its input (Zod, capped lists); reads live in non-action modules; a repo test fails if an exported action skips the session check or a page skips `requireUser`. Next.js checks the Origin of every action.                                                                                                                                  |
| R14 | Session forgery or theft                                                    | Better Auth sessions stored server-side and looked up on every page (a cookie's presence only drives the proxy redirect); `HttpOnly`/`SameSite=Lax` cookies, `Secure` on https; Better Auth rejects cross-origin requests that carry cookies (403 verified); `callbackURL` to another site refused (403 verified). Cross-origin requests _without_ cookies can start a Google sign-in, which grants nothing. |

**Controls → files** table is added as the code lands (§13).

## 9. Configuration and secrets

- `packages/config/src/env.ts` parses `process.env` with Zod once at startup;
  missing or malformed values fail fast with a clear message. Nothing else
  reads `process.env`.
- Committed: `.env.example` (names and placeholder values only).
- Local: `.env.local` (gitignored). Production/preview: Vercel project env
  settings. Neon gives separate branches/databases for preview vs production.
- Secrets list: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID`/
  `SECRET`, `YAHOO_CLIENT_ID`/`SECRET` (M3b), `TOKEN_ENCRYPTION_KEY` (M3b),
  `CRON_SECRET`. `OWNER_EMAIL` and `BETTER_AUTH_URL` are config, not
  secrets, but still live in env because they differ per deployment. Non-secret config (base URLs, TTLs, limits) is in code
  constants, not env.

## 10. CI/CD

| Workflow     | Triggers                                      | Jobs                                                                                                                                                        |
| ------------ | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ci.yml`     | push to `main`, PRs, weekly, manual           | install (frozen lockfile, pnpm cache) → lint (warnings = errors) → typecheck → unit/property/contract tests → build → `pnpm audit` + OSV-Scanner → gitleaks |
| `codeql.yml` | push, PR, weekly                              | CodeQL `javascript-typescript`                                                                                                                              |
| `e2e.yml`    | on Vercel preview `deployment_status` success | Playwright against the preview URL, signed in as a seeded test user on the preview database                                                                 |
| Dependabot   | weekly                                        | npm (grouped: next/react, eslint, testing, drizzle) and github-actions                                                                                      |

- Deploys: Vercel GitHub app builds a preview for every PR and production on
  merge to `main`. No Vercel token in GitHub.
- `main` protected by a ruleset (JSON in `.github/rulesets/main.json`):
  PR required, required checks by exact job name, no force push. Rulesets on
  private repos need a paid plan; on free, apply when the repo goes public.
- CodeQL also scans the workflow files (`actions` language). Uploading
  results needs code scanning: free on public repos. On a **private** repo
  without GitHub Code Security, set `upload: never` with an `output:` folder and
  fail the job on findings in the SARIF instead.
- Every third-party action is pinned to a commit SHA with the version in a
  comment; Dependabot updates both. Checkouts use `persist-credentials: false`.
- CI runs every task on every push. Turborepo remote caching (which would skip
  unchanged packages) is not enabled: it needs a Vercel token in GitHub, and
  the full run takes about a minute today.

## 11. Testing strategy

| Layer       | Tests                                                                                                                                                                                                                                                                                                                                                                               |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `domain`    | Schema round-trips; sport registry consistency (every lineup slot maps to known positions).                                                                                                                                                                                                                                                                                         |
| `analysis`  | Unit tests with small hand-built leagues; property tests: all-play wins sum correctly, lineup optimizer never starts an ineligible player and is never beaten by a random valid lineup, trade evaluation is antisymmetric (A's gain = B's loss in raw value), recommender output always passes `evaluate`. Each property checked once against a deliberately broken implementation. |
| `providers` | Mapper tests on recorded, scrubbed fixtures; adapter contract suite (§5.2) for every provider; property test "mapper rejects or maps, never throws, on arbitrary JSON". HTTP mocked with MSW.                                                                                                                                                                                       |
| `db`        | Repository tests against a disposable Postgres (Testcontainers or Neon branch in CI); encryption round-trip and "ciphertext never equals plaintext" properties.                                                                                                                                                                                                                     |
| `apps/web`  | Route handler tests (validation and error mapping); component tests for celebration (reduced-motion path); Playwright E2E for link → leagues → matchup → trade calculator.                                                                                                                                                                                                          |
| Repo        | Boundary test (layer imports); fixture-scrub test (R1); "only `config` reads `process.env`" test.                                                                                                                                                                                                                                                                                   |

No fuzzing target initially: there are no hand-written parsers, and Zod plus
property tests cover the untrusted-JSON surface. Revisit if we parse XML or
CSV.

## 12. Milestones

Each milestone is a deployable vertical slice with CI green.

| M   | Slice                  | Done when                                                                                                                                                                    |
| --- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M0  | Skeleton               | Monorepo, packages with facades, lint boundaries, CI/CodeQL/gitleaks/Dependabot green; "hello" page live on Vercel preview and production. **Done 2026-11-11** (see M0 log). |
| M1  | Sleeper leagues        | Enter Sleeper username → list of NFL leagues for the season → league page with standings. No accounts yet (username in URL). **Done 2026-11-11** (see M1 log).               |
| M2  | Matchups + celebration | My matchups across leagues and league-wide view for any week; live polling; win celebration (local "seen" flag until M3). **Done 2026-11-11** (see M2 log).                  |
| M3a | Accounts               | Google sign-in, invite-only; Postgres (Neon / PGlite); saved Sleeper username; celebration "seen" in the database.                                                           |
| M3b | Yahoo                  | Yahoo OAuth connect (encrypted tokens), Yahoo leagues and matchups through the same UI; provider contract suite passes for both.                                             |
| M4  | League analysis        | All-play, luck, power rankings, positional strength.                                                                                                                         |
| M5  | Trade calculator       | Two-sided picker, lineup-aware evaluation, fairness verdict.                                                                                                                 |
| M6  | Trade recommendations  | Ranked mutually beneficial suggestions per opponent.                                                                                                                         |
| M7  | Basketball             | `nba` in the sport registry, category scoring in matchups and analysis, Sleeper + Yahoo NBA mappings.                                                                        |

### M0 log (2026-11-11)

Done and verified locally: format check, lint (0 warnings), typecheck, 65
tests (unit + property + repo checks), production build, `pnpm audit` clean,
and a smoke run of `next start` (health route answers, every script carries
the CSP nonce, no console or CSP errors).

- Packages: `domain` (provider ids, sport registry, `LeagueRef` keys),
  `config` (env parsing, provider endpoints, cache policy), `analysis`
  (`matchupOutcome`), `providers` (`providerUrl`, the safe URL builder), the
  `web` app, and `tooling/repo-checks`.
- Every page renders per request so the CSP nonce can be applied; static
  prerendering would ship scripts without a nonce.
- GitHub (2026-11-11): public repo `zachbil5/ff-command-center`. First CI
  and CodeQL runs passed every job; gitleaks scanned the full history (1
  commit) with no leaks; 0 code scanning, Dependabot or secret scanning
  alerts. Secret scanning + push protection, private vulnerability
  reporting, Dependabot alerts and security updates are on; the `main`
  ruleset is active (admin bypass).
- Vercel: the first deploy failed with `ERR_PNPM_UNSUPPORTED_ENGINE`:
  "Expected version: >=24 <25, Got: v26.13.0". Vercel's default Node is 26
  and the pin was missing from `apps/web` (see §2). pnpm itself was fine:
  Vercel read `packageManager` and used pnpm 10. Fixed by pinning
  `engines.node` in the app (PR #1, `aacc693`); PR preview and production
  then built.
- Production (2026-11-11): `ff-command-center-random-4df1.vercel.app`.
  `ff-command-center.vercel.app` belongs to an unrelated project, so never
  link it. Checked from a signed-in browser session: page returns 200;
  CSP has a fresh nonce, `'strict-dynamic'`, no `unsafe-eval` or
  `unsafe-inline`, `object-src 'none'`, `frame-ancestors 'none'`; 9 of 9
  scripts carry the nonce; X-Frame-Options, nosniff, HSTS,
  Referrer-Policy and Permissions-Policy present; no `X-Powered-By`;
  `/api/health` returns `{"status":"ok"}` with `no-store`; no console
  errors.
- Access: Vercel Authentication protects every deployment, including
  production, so only Vercel team members can open the site. Keep it on
  until the app's own sign-in lands (M3); then turn it off for production or
  add a custom domain so friends can reach it (§15 Q2).

### M1 log (2026-11-11)

Built: Sleeper username search → that user's NFL leagues for the current
season (with a link to last season) → league page with standings (win %,
then points for; the user's own team highlighted).

- Routes: `/` (search form, plain GET, no client JavaScript), `/sleeper`
  (route handler: validate, 303 redirect), `/sleeper/[username]?season=`,
  `/leagues/[provider]/[sport]/[season]/[leagueId]?me=`. League URLs use
  path segments rather than a `provider:sport:season:id` key, so nothing
  needs decoding. All URL building and parsing lives in
  `apps/web/src/routes.ts`.
- Domain: `ProviderUser`, `League`, `Team`, `TeamRecord`. Analysis:
  `standings()` (deterministic: any input order gives the same table).
- Verified: 133 tests (property tests for standings order-independence,
  username/route parsing, and "the adapter only throws provider errors on
  any JSON"); lint, types, build. Production build smoke-tested against the
  live Sleeper API: unknown user, invalid username, an `//evil.example`
  redirect attempt, bad and unknown league URLs, and a real user's leagues
  and a 10-team standings table (ranks contiguous, order correct, one row
  highlighted, avatars load, no console or CSP errors, fits a 375px phone
  after fixing name truncation).
- Not done in M1: the per-provider concurrency cap (done in M2).

### M2 log (2026-11-11)

Built: matchups for any week on the league page (every pairing, winners
bold once final), "My matchups" across all of a user's current-season
leagues, live re-rendering during the current week, and the win celebration
with Replay. New package `@ffc/ui` holds the celebration.

- Domain: `Matchup`, `MatchupSide`, `MatchupStatus` (moved from analysis
  so it has one home); `League.currentWeek` / `lastScoredWeek`. Analysis:
  `weekStatus`, `defaultWeek`, `celebrationWeek`, `commonDefaultWeek`,
  `teamWeek`.
- Providers: `getMatchups` with live/idle cache lifetimes, Sleeper pairing
  (`mapMatchups`), the request cap, and contract-suite checks that every
  team plays at most once a week and only against teams in the league.
- Web: `features/provider-access` (shared adapter wiring and error mapping,
  so features don't import each other), `features/matchups`, new routes
  `/sleeper/<username>/matchups?week=` and `?week=` on league pages.
- Verified: 185 tests, including properties that week status never goes
  backwards (checked against the broken rule first), at most one week is
  live, pairing never lists a team twice and accounts for every entry, and
  the request cap never exceeds its limit. Production build against live
  Sleeper with a real account: week 9 Final, week 10 This week (live
  refresh shown), week 12 Upcoming; "My matchups" with two leagues; the
  celebration listed both week-9 wins, took focus, and stayed dismissed after
  a reload; Replay works; with reduced motion the banner shows without
  confetti, and without it the confetti canvas runs (fixed, click-through)
  with no console or CSP errors; fits a 375px phone.
- Found while testing: Sleeper's current week begins before kickoff, so the
  live state is labelled "This week" rather than "Live".

### M3a log (2026-11-11)

Built: Google sign-in (invite-only), owner invite management, sign-in
required on every page, linked Sleeper account in Settings (home then opens
your matchups), and celebration "seen" stored per user in Postgres. New
package `@ffc/db` (Drizzle schema, first migration, repositories, migrate
script); `@ffc/db/testing` gives tests an in-memory Postgres.

- Verified: 227 tests. New: repositories against real Postgres (PGlite),
  including cascading deletes; Better Auth integration (owner allowed,
  stranger refused, invited email allowed case-insensitively, sessions
  round-trip through our tables), checked against a build with the invite
  gate removed; access-boundary repo tests (pages and actions), each checked
  against broken code. Local production build smoke test: every page
  redirects to sign-in without a session, a forged session cookie is
  rejected by the page check, Better Auth starts Google sign-in with state +
  PKCE (S256) and only `openid email profile`, rejects an off-site
  callbackURL and cross-origin cookie requests; migrate script skips in CI,
  fails on Vercel without DATABASE_URL, migrates PGlite locally.
- Not verified yet: a real Google sign-in (needs your OAuth client) and the
  first Neon migration on Vercel.
- Better Auth is pinned to 1.7.18 (a week older than the latest) as a
  supply-chain buffer; Dependabot will offer updates.

## 13. Security controls → files

| Control                                                        | File                                                                                                                    |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| R1 secrets kept out of git                                     | `.gitignore`, `.env.example`, `.github/workflows/ci.yml` (gitleaks)                                                     |
| R3 nonce CSP, no eval/inline in production                     | `apps/web/src/security/csp.ts`, `apps/web/src/proxy.ts`                                                                 |
| R3 static security headers, image host allowlist               | `apps/web/next.config.ts`                                                                                               |
| R3 `dangerouslySetInnerHTML` / `innerHTML` banned              | `eslint.config.mjs`                                                                                                     |
| R4 fixed provider hosts                                        | `packages/config/src/providers.ts`                                                                                      |
| R4 safe outbound URL building                                  | `packages/providers/src/provider-url.ts`                                                                                |
| R4 safe provider id charset                                    | `packages/domain/src/league-ref.ts`                                                                                     |
| R4 URL input parsed before use (username, season, league)      | `apps/web/src/routes.ts`, `packages/providers/src/sleeper/raw.ts`                                                       |
| R6 search redirect only to same-origin relative paths          | `apps/web/src/app/sleeper/route.ts`                                                                                     |
| R12 invite gate on every user creation                         | `apps/web/src/features/auth/auth.ts` (user.create hook), `packages/db/src/repos/invites.ts`                             |
| R13/R14 session checks on pages and actions; access repo test  | `apps/web/src/features/auth/session.ts`, `tooling/repo-checks/src/access.test.ts`                                       |
| R13 action input parsing                                       | `apps/web/src/features/matchups/actions.ts`, `accounts/actions.ts`, `invites/actions.ts`                                |
| R14 optimistic redirect without a session cookie               | `apps/web/src/proxy.ts`                                                                                                 |
| R2 OAuth tokens encrypted at rest, telemetry off               | `apps/web/src/features/auth/auth.ts`                                                                                    |
| R5 per-provider request cap                                    | `packages/providers/src/http.ts` (`withConcurrencyLimit`), `apps/web/src/features/provider-access/provider-registry.ts` |
| R3 celebration: no SSR styles, no blob: worker, reduced motion | `packages/ui/src/celebration/celebration.tsx`                                                                           |
| R5/R8 timeout, size cap, no redirects, typed errors            | `packages/providers/src/http.ts`, `packages/config/src/providers.ts`                                                    |
| R8 provider data validated and capped; bad items skipped       | `packages/providers/src/sleeper/raw.ts`, `sleeper/adapter.ts`                                                           |
| R3 avatars only from allowlisted CDN, plain ids only           | `packages/providers/src/avatar.ts`                                                                                      |
| R3 no inline `style` (blocked by CSP); own 404 page            | `apps/web/src/components/avatar.tsx`, `apps/web/src/app/not-found.tsx`                                                  |
| Env errors never echo values                                   | `packages/config/src/env.ts`                                                                                            |
| Only `config` reads env; pure packages stay pure               | `tooling/repo-checks/src/layers.test.ts`                                                                                |
| R9 frozen lockfile, audit, OSV, install-script allowlist       | `.github/workflows/ci.yml`, `pnpm-workspace.yaml`                                                                       |
| R10 read-only CI token, SHA-pinned actions                     | `.github/workflows/*.yml`                                                                                               |

## 14. Development

Prerequisites: Node 24 (`.nvmrc`) and pnpm via Corepack (`corepack enable pnpm`),
which picks up the pinned version from `packageManager`.

```bash
pnpm install --frozen-lockfile   # install from lockfile
cp .env.example apps/web/.env.local   # then fill in Google client + OWNER_EMAIL
pnpm dev                         # migrates local PGlite, then Next.js on http://localhost:3000
pnpm db:migrate                  # apply migrations (PGlite locally, Neon if DATABASE_URL set)
pnpm db:generate                 # new migration after a schema change (commit it)
pnpm --filter @ffc/web dev:https # local HTTPS, needed for Yahoo OAuth (M3)
pnpm format                      # Prettier write
pnpm lint                        # ESLint, warnings fail
pnpm typecheck                   # tsc --noEmit across packages
pnpm test                        # Vitest across packages
pnpm build                       # production build of the app
pnpm check                       # everything CI's main job runs, in order
```

Added in later milestones: `pnpm test:e2e` (Playwright), `pnpm fixtures:scrub`.

Local sign-in needs a Google OAuth client whose redirect URIs include
`http://localhost:3000/api/auth/callback/google`, and `OWNER_EMAIL` set
to your Google address. Delete `.data/` to reset the local database.

Commit identity: this repo uses the GitHub no-reply email (set with
`git config user.email` in this repo only). On GitHub, also enable "Keep my
email addresses private" and "Block command line pushes that expose my email".

## 15. Open questions

1. Value source for the trade engine beyond our own VORP: check FantasyCalc
   (or similar) terms before using it. Is dynasty support (rookie picks)
   needed in v1?
2. ~~Domain name~~ Decided: keep the vercel.app URL for now (§6.1).
3. ~~Sign-in method~~ Decided: Google only, invite-only (§6.1).
4. Licence for the repo if it goes public (MIT vs all rights reserved).
