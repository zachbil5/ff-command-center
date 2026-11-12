# Fantasy Football Center

A command center for all your fantasy leagues: every league in one place,
your matchup and the whole league's matchups, league analysis, a trade
calculator and trade recommendations. Sleeper and Yahoo first; football now,
basketball later.

**Status:** planning. See [DESIGN.md](DESIGN.md) for decisions, architecture,
the threat model and milestones.

## Stack

TypeScript · Next.js · React · Tailwind + shadcn/ui · TanStack Query · Zod ·
Postgres (Neon) + Drizzle · Better Auth · Motion + canvas-confetti · Vitest,
fast-check, Playwright · pnpm + Turborepo · GitHub Actions · Vercel

## Quick start

Needs Node 24 and pnpm (`corepack enable pnpm`).

```bash
pnpm install --frozen-lockfile
pnpm dev
```

`pnpm check` runs everything CI runs. All commands are in
[DESIGN.md §14](DESIGN.md#14-development).

## Secrets

Nothing secret is committed. Copy `.env.example` to `.env.local` for local
development; production values live in the hosting provider's settings.
