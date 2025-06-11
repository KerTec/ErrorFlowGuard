import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
});

export const apps = pgTable("apps", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  apiKey: text("api_key").notNull().unique(),
  userId: integer("user_id").notNull().references(() => users.id),
  domain: text("domain"),
  plan: text("plan").notNull().default("free"),
  errorCount: integer("error_count").notNull().default(0),
  monthlyErrorCount: integer("monthly_error_count").notNull().default(0),
  lastResetDate: timestamp("last_reset_date").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const errorReports = pgTable("error_reports", {
  id: serial("id").primaryKey(),
  appId: integer("app_id").notNull().references(() => apps.id),
  type: text("type").notNull(),
  message: text("message").notNull(),
  source: text("source").notNull(),
  url: text("url").notNull(),
  userAgent: text("user_agent").notNull(),
  stackTrace: text("stack_trace"),
  metadata: jsonb("metadata"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  resolved: boolean("resolved").default(false).notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
});

export const insertAppSchema = createInsertSchema(apps).pick({
  name: true,
  userId: true,
  domain: true,
});

export const insertErrorReportSchema = createInsertSchema(errorReports).pick({
  appId: true,
  type: true,
  message: true,
  source: true,
  url: true,
  userAgent: true,
  stackTrace: true,
  metadata: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertApp = z.infer<typeof insertAppSchema>;
export type App = typeof apps.$inferSelect;
export type ErrorReport = typeof errorReports.$inferSelect;
export type InsertErrorReport = z.infer<typeof insertErrorReportSchema>;
