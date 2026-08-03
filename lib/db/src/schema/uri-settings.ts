import { pgTable, serial, text } from "drizzle-orm/pg-core";

export const uriSettingsTable = pgTable("uri_settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
});

export type UriSetting = typeof uriSettingsTable.$inferSelect;
