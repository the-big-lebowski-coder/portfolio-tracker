import { pgTable, serial, text, numeric, date, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const uriTransactionsTable = pgTable("uri_transactions", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  amount: numeric("amount").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  date: date("date").notNull(),
  balanceAfter: numeric("balance_after").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUriTransactionSchema = createInsertSchema(uriTransactionsTable).omit({
  id: true,
  createdAt: true,
});

export type InsertUriTransaction = z.infer<typeof insertUriTransactionSchema>;
export type UriTransaction = typeof uriTransactionsTable.$inferSelect;
