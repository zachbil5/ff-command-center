// App-owned tables (DESIGN §7): invites, linked provider accounts, celebrated wins.
// Does not own Better Auth's tables (auth.ts) or queries (repos/).
import { integer, pgTable, primaryKey, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { user } from './auth';

/** Emails allowed to create an account (stored lower-cased). */
export const invite = pgTable('invite', {
  email: text('email').primaryKey(),
  invitedBy: text('invited_by').references(() => user.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/** A user's identity at a fantasy provider; one per provider for now. */
export const linkedAccount = pgTable(
  'linked_account',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    provider: text('provider').notNull(),
    externalUserId: text('external_user_id').notNull(),
    username: text('username').notNull(),
    displayName: text('display_name').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [unique('linked_account_user_provider').on(table.userId, table.provider)],
);

/** Wins a user has already celebrated, so the banner shows once per league-week. */
export const celebrationSeen = pgTable(
  'celebration_seen',
  {
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    /** leagueRefKey() of the league. */
    leagueKey: text('league_key').notNull(),
    week: integer('week').notNull(),
    seenAt: timestamp('seen_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.leagueKey, table.week] })],
);
