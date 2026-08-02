import { pgTable, serial, text } from "drizzle-orm/pg-core";

export const ronaSettingsTable = pgTable("rona_settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
});

export type RonaSetting = typeof ronaSettingsTable.$inferSelect;
