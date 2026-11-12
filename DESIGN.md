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
| D5  | Client data          | TanStack Query for client-side polling and cache; server components for first render                                                                                                                                                  | Matchups need polling during games, with stale-while-revalidate and backoff.                                                                                                                                                                    | SWR: similar; Query has better devtools and mutation story.                                                             |
| D6  | Validation           | Zod at every boundary (env, provider responses, route input)                                                                                                                                                                          | Provider APIs are unofficial or loosely typed; parse into domain types or reject (§8).                                                                                                                                                          | io-ts / valibot: fine; Zod has the widest ecosystem.                                                                    |
| D7  | Database             | Postgres (Neon free tier) via Drizzle ORM + drizzle-kit migrations                                                                                                                                                                    | Stores users, linked accounts, encrypted Yahoo tokens, cached snapshots, celebration-seen flags. Drizzle is typed SQL with no codegen step.                                                                                                     | Supabase: also fine. SQLite/Turso: works, less standard on Vercel. Prisma: heavier, binary engine.                      |
| D8  | Auth (app sign-in)   | Better Auth, invite-only (Google or email magic link)                                                                                                                                                                                 | Small friend group, no passwords stored by us. Yahoo linking is a separate OAuth "connection", not the app login.                                                                                                                               | Auth.js: now maintained by the Better Auth team. Clerk: hosted, good, but external dependency for user data.            |
| D9  | Providers in v1      | Sleeper (username, public API) and Yahoo (OAuth 2.0, read-only scope)                                                                                                                                                                 | User's leagues are on these. Each sits behind one `FantasyProvider` interface (§5).                                                                                                                                                             | ESPN later: needs `espn_s2`/`SWID` cookies for private leagues.                                                         |
| D10 | Player values        | Our own value model in `analysis`: points-per-game / rest-of-season projection → value over replacement (VORP) using **each league's** roster and scoring settings. Optional external market values behind a `ValueSource` interface. | Owning the model avoids licensing problems and adapts to custom scoring. External sources (e.g. FantasyCalc) only after checking their terms. Never scrape sites without an API (e.g. KeepTradeCut).                                            | Only external values: easy but generic, and ToS risk.                                                                   |
| D11 | Animation            | Motion (framer-motion) for UI transitions; `canvas-confetti` for the win burst; durations in a timings module                                                                                                                         | Small, well maintained, React-native API. Respects `prefers-reduced-motion` (static banner instead).                                                                                                                                            | Lottie: needs designed assets. Pure CSS: fine for transitions, weak for particles.                                      |
| D12 | Testing              | Vitest, fast-check (property tests), MSW with recorded and scrubbed fixtures, Playwright for E2E                                                                                                                                      | Fast unit tests in every package; providers tested against real-shaped data without network.                                                                                                                                                    | Jest: slower, ESM pain.                                                                                                 |
| D13 | Lint / format        | ESLint 9 flat config + typescript-eslint (strict, type-aware) + eslint-config-next for the app; Prettier; warnings fail CI. Layer rules are tests in `tooling/repo-checks` (§4).                                                      | Layer rules are enforced by tooling, not discipline. A small import-scanning test replaced `eslint-plugin-boundaries` in M0: no resolver plugins, and it also checks `package.json` declarations and purity.                                    | Biome: fast, but no Next.js rules.                                                                                      |
| D14 | Hosting              | Vercel (Hobby) for the app; Neon for Postgres; Vercel Cron for daily jobs                                                                                                                                                             | Free, preview deploy per PR through the Vercel GitHub app, so **no deploy token is stored in GitHub**. Secrets live in Vercel env settings.                                                                                                     | Docker on a VPS: more control, more upkeep.                                                                             |
| D15 | CI/CD                | GitHub Actions (checks) + Vercel Git integration (deploys)                                                                                                                                                                            | CI never needs production secrets. Details §10.                                                                                                                                                                                                 | Deploying from Actions with a Vercel token: one more secret to guard.                                                   |
| D16 | Runtime              | Node.js current LTS, pinned in `.nvmrc` and `engines`; pnpm pinned via `packageManager`                                                                                                                                               | Same toolchain locally, in CI and on Vercel.                                                                                                                                                                                                    | —                                                                                                                       |
| D17 | Sports               | Sport is data, not a code path: a sport registry in `domain` (positions, lineup slots, scoring kind)                                                                                                                                  | Basketball later means adding registry entries and provider mappings, not forking features. NBA leagues often use **category** scoring, so the domain supports `points` and `categories` from day one (§5.3).                                   | Football-only types: basketball becomes a rewrite.                                                                      |

Exact package versions live in `package.json` files and the lockfile, not in
this document. Version ceilings chosen deliberately in M0 (each has a matching
Dependabot `ignore` with the reason):

- **pnpm 10** (not 12): settled behaviour; revisit as a planned upgrade.
- **ESLint 9** (not 10): eslint-config-next's plugins (react, import, jsx-a11y)
  only support ESLint 9. ESLint 9 is out of upstream support, which is
  acceptable for a dev-only tool; move to 10 when eslint-config-next does.
- **TypeScript 6** (not 7): typescript-eslint supports TypeScript < 6.1.
- **Node 24 LTS** with matching `@types/node` 24.
- `minimatch` is overridden to 11.0.8 (`pnpm.overrides`) to clear
  GHSA-g3hv-75wg-m249 in a lint-only dependency path. Drop the override when
  upstream moves.

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
      leagues/ matchups/ analysis/ trades/ linking/ celebration/
    src/state/            client state (query hooks, UI stores)
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
                          animation (no data fetching). (Created in M2.)
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

```ts
// packages/providers/src/provider.ts
interface FantasyProvider {
  readonly id: ProviderId;
  readonly sports: readonly Sport[];
  readonly auth: 'none' | 'oauth'; // drives UI: "enter username" vs "Connect"
  listLeagues(account: LinkedAccount, sport: Sport, season: number): Promise<League[]>;
  getLeague(ref: LeagueRef): Promise<League>;
  getTeams(ref: LeagueRef): Promise<Team[]>;
  getMatchups(ref: LeagueRef, week: number): Promise<Matchup[]>;
  getTransactions(ref: LeagueRef, week: number): Promise<Transaction[]>;
  getCurrentWeek(sport: Sport): Promise<number>;
}
```

A **contract test suite** runs the same assertions against every adapter using
recorded fixtures: every adapter returns valid domain objects, every team's
roster refers to known players, matchups pair up, and so on. Adding a provider
means making that suite pass.

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

- Week picker defaults to the current week from the provider.
- "My matchups" shows one card per league: me vs opponent, score, projected,
  status. "League" view shows every pairing.
- During game windows the client polls at the matchup TTL with backoff, and
  stops when the tab is hidden.

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

- Trigger: the user opens the app, and a matchup of theirs is `final`, they
  won, and `celebration_seen(user, leagueRef, week)` is not set.
- Show once per (league, week); multiple wins → one combined celebration.
  "Replay" button on the matchup card.
- `prefers-reduced-motion` → static "You won!" banner, no confetti.
- Component lives in `packages/ui/celebration/`, takes `{ wins[] , onDone }`,
  has no data fetching. Durations come from `timings.ts`.

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
by a CI/CD step (never by the app at runtime).

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

| #   | Risk                                                                    | Control                                                                                                                                                                                                                                                                          |
| --- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | Secrets or personal data committed to GitHub                            | Only `.env.example` with placeholder names is tracked; `.env*` gitignored; gitleaks in CI on every push and a scheduled full-history run; GitHub push protection; noreply commit email; fixtures scrubbed by a script and a test that fails on emails, tokens or real usernames. |
| R2  | Yahoo tokens stolen from DB                                             | Tokens encrypted (AES-256-GCM, key only in Vercel env, key id for rotation); read-only `fspt-r` scope; DB role without DDL rights for the app; tokens never logged or sent to the browser.                                                                                       |
| R3  | XSS via league/team names from providers                                | React escaping only; `dangerouslySetInnerHTML` banned by lint; strict CSP with nonces; Zod caps string lengths; images only from allowlisted provider hosts (`next.config` `images.remotePatterns`).                                                                             |
| R4  | SSRF / path injection via username or league ID                         | Inputs parsed to strict formats (Sleeper username charset and length, numeric IDs, Yahoo keys by regex); URLs built from fixed base URLs in `config` with `encodeURIComponent`; no user-supplied hosts ever.                                                                     |
| R5  | Our server gets rate-limited or banned by a provider; abuse of our API  | Shared server cache (§3.2); per-user rate limit on route handlers; only signed-in, invited users; outbound concurrency cap per provider.                                                                                                                                         |
| R6  | OAuth CSRF, code interception, open redirect                            | `state` + PKCE; fixed registered redirect URIs; post-login redirect only to same-origin relative paths.                                                                                                                                                                          |
| R7  | Session theft                                                           | `HttpOnly`, `Secure`, `SameSite=Lax` cookies; short sessions with rotation; CSP; no tokens in `localStorage`.                                                                                                                                                                    |
| R8  | Malformed or changed provider responses crash pages or corrupt analysis | Zod parse at the adapter; invalid → typed `ProviderError`, page shows "provider unavailable" for that league only; property tests "mapper never throws on any JSON".                                                                                                             |
| R9  | Supply-chain compromise                                                 | Lockfile with `--frozen-lockfile`; Dependabot grouped weekly; `pnpm audit` + OSV-Scanner in CI; minimal dependencies, each justified; actions pinned to SHA.                                                                                                                     |
| R10 | Over-privileged CI                                                      | Workflows `permissions: contents: read` by default; CI holds **no** production secrets (Vercel deploys through its own GitHub app); no `pull_request_target`.                                                                                                                    |
| R11 | Provider terms of service                                               | Personal, non-commercial use; read-only; attribution; respect stated rate limits; no scraping of sites without APIs. Re-check before opening to the public.                                                                                                                      |

**Controls → files** table is added as the code lands (§13).

## 9. Configuration and secrets

- `packages/config/src/env.ts` parses `process.env` with Zod once at startup;
  missing or malformed values fail fast with a clear message. Nothing else
  reads `process.env`.
- Committed: `.env.example` (names and placeholder values only).
- Local: `.env.local` (gitignored). Production/preview: Vercel project env
  settings. Neon gives separate branches/databases for preview vs production.
- Secrets list: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID`/
  `SECRET`, `YAHOO_CLIENT_ID`/`SECRET`, `TOKEN_ENCRYPTION_KEY`,
  `CRON_SECRET`. Non-secret config (base URLs, TTLs, limits) is in code
  constants, not env.

## 10. CI/CD

| Workflow         | Triggers                                                 | Jobs                                                                                                                                                        |
| ---------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ci.yml`         | push to `main`, PRs, weekly, manual                      | install (frozen lockfile, pnpm cache) → lint (warnings = errors) → typecheck → unit/property/contract tests → build → `pnpm audit` + OSV-Scanner → gitleaks |
| `codeql.yml`     | push, PR, weekly                                         | CodeQL `javascript-typescript`                                                                                                                              |
| `e2e.yml`        | on Vercel preview `deployment_status` success            | Playwright against the preview URL, signed in as a seeded test user on the preview database                                                                 |
| `db-migrate.yml` | push to `main` touching `packages/db/migrations`, manual | applies migrations to production; the only job with a DB secret, in a protected GitHub **environment** with required approval                               |
| Dependabot       | weekly                                                   | npm (grouped: next/react, eslint, testing, drizzle) and github-actions                                                                                      |

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

| M   | Slice                  | Done when                                                                                                                                                                                                    |
| --- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| M0  | Skeleton               | Monorepo, packages with facades, lint boundaries, CI/CodeQL/gitleaks/Dependabot green; "hello" page live on Vercel preview and production. **Local part done** (see below); GitHub and Vercel setup pending. |
| M1  | Sleeper leagues        | Enter Sleeper username → list of NFL leagues for the season → league page with standings. No accounts yet (username in URL/local state).                                                                     |
| M2  | Matchups + celebration | My matchups across leagues and league-wide view for any week; live polling; win celebration (local "seen" flag until M3).                                                                                    |
| M3  | Accounts + Yahoo       | Better Auth invite-only sign-in; Postgres; saved linked accounts; Yahoo OAuth connect, Yahoo leagues/matchups through the same UI; provider contract suite passes for both; celebration-seen moves to DB.    |
| M4  | League analysis        | All-play, luck, power rankings, positional strength.                                                                                                                                                         |
| M5  | Trade calculator       | Two-sided picker, lineup-aware evaluation, fairness verdict.                                                                                                                                                 |
| M6  | Trade recommendations  | Ranked mutually beneficial suggestions per opponent.                                                                                                                                                         |
| M7  | Basketball             | `nba` in the sport registry, category scoring in matchups and analysis, Sleeper + Yahoo NBA mappings.                                                                                                        |

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
- Not yet verified: the GitHub Actions workflows have not run (no remote yet);
  gitleaks and OSV-Scanner were not run locally. Vercel project not created.

## 13. Security controls → files

| Control                                                  | File                                                                |
| -------------------------------------------------------- | ------------------------------------------------------------------- |
| R1 secrets kept out of git                               | `.gitignore`, `.env.example`, `.github/workflows/ci.yml` (gitleaks) |
| R3 nonce CSP, no eval/inline in production               | `apps/web/src/security/csp.ts`, `apps/web/src/proxy.ts`             |
| R3 static security headers, image host allowlist         | `apps/web/next.config.ts`                                           |
| R3 `dangerouslySetInnerHTML` / `innerHTML` banned        | `eslint.config.mjs`                                                 |
| R4 fixed provider hosts                                  | `packages/config/src/providers.ts`                                  |
| R4 safe outbound URL building                            | `packages/providers/src/provider-url.ts`                            |
| R4 safe provider id charset                              | `packages/domain/src/league-ref.ts`                                 |
| Env errors never echo values                             | `packages/config/src/env.ts`                                        |
| Only `config` reads env; pure packages stay pure         | `tooling/repo-checks/src/layers.test.ts`                            |
| R9 frozen lockfile, audit, OSV, install-script allowlist | `.github/workflows/ci.yml`, `pnpm-workspace.yaml`                   |
| R10 read-only CI token, SHA-pinned actions               | `.github/workflows/*.yml`                                           |

## 14. Development

Prerequisites: Node 24 (`.nvmrc`) and pnpm via Corepack (`corepack enable pnpm`),
which picks up the pinned version from `packageManager`.

```bash
pnpm install --frozen-lockfile   # install from lockfile
pnpm dev                         # Next.js dev server on http://localhost:3000
pnpm --filter @ffc/web dev:https # local HTTPS, needed for Yahoo OAuth (M3)
pnpm format                      # Prettier write
pnpm lint                        # ESLint, warnings fail
pnpm typecheck                   # tsc --noEmit across packages
pnpm test                        # Vitest across packages
pnpm build                       # production build of the app
pnpm check                       # everything CI's main job runs, in order
```

Added in later milestones: `pnpm test:e2e` (Playwright), `pnpm db:generate`
and `pnpm db:migrate` (drizzle-kit), `pnpm fixtures:scrub`.

Commit identity: this repo uses the GitHub no-reply email (set with
`git config user.email` in this repo only). On GitHub, also enable "Keep my
email addresses private" and "Block command line pushes that expose my email".

## 15. Open questions

1. Value source for the trade engine beyond our own VORP: check FantasyCalc
   (or similar) terms before using it. Is dynasty support (rookie picks)
   needed in v1?
2. Domain name for production (needed for the Yahoo redirect URI and a stable
   preview domain).
3. Sign-in method for friends: Google, email magic link, or both? (Magic
   links need an email sender such as Resend, with one more secret.)
4. Licence for the repo if it goes public (MIT vs all rights reserved).
