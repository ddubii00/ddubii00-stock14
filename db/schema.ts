import { sqliteTable,text } from 'drizzle-orm/sqlite-core';
export const snapshots=sqliteTable('snapshots',{date:text('date').primaryKey(),payload:text('payload').notNull(),savedAt:text('saved_at').notNull()});
export const rankingPreferences=sqliteTable('ranking_preferences',{userId:text('user_id').primaryKey(),payload:text('payload').notNull(),updatedAt:text('updated_at').notNull()});
