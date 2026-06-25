import { text, timestamp, integer, jsonb, pgTable, serial, unique } from 'drizzle-orm/pg-core'

export const sportsData = pgTable('sports_data', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  data: jsonb('data').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  unique('sports_data_name_unique').on(table.name),
])
