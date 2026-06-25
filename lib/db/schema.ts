import { text, timestamp, integer, jsonb, pgTable, serial, unique } from 'drizzle-orm/pg-core'

// Generic key-value store for JSON blobs (tournament data, index, etc.)
// Keys: "wc-1998", "wc-2022", "wc-2026", "wc-index", "world-cups"
export const sportsData = pgTable('sports_data', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  data: jsonb('data').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  unique('sports_data_name_unique').on(table.name),
])

// Sync log for cron audit trail
export const syncLogs = pgTable('sync_logs', {
  id: serial('id').primaryKey(),
  tournamentYear: integer('tournament_year').notNull(),
  syncedAt: timestamp('synced_at').defaultNow().notNull(),
  matchesUpdated: integer('matches_updated').notNull().default(0),
  liveMatchCount: integer('live_match_count').notNull().default(0),
  dataSource: text('data_source').notNull().default('json'),
  status: text('status').notNull().default('ok'),
  errorMessage: text('error_message'),
})
