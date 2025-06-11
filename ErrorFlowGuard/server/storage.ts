import { users, apps, errorReports, type User, type InsertUser, type App, type InsertApp, type ErrorReport, type InsertErrorReport } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, lt, sql } from "drizzle-orm";
import { randomBytes } from "crypto";

export interface IStorage {
  // User management
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // App management
  createApp(app: InsertApp): Promise<App>;
  getAppByApiKey(apiKey: string): Promise<App | undefined>;
  getAppsByUserId(userId: number): Promise<App[]>;
  incrementAppErrorCount(appId: number): Promise<void>;

  // Error reporting
  createErrorReport(errorReport: InsertErrorReport): Promise<ErrorReport>;
  getErrorReports(appId: number, limit?: number): Promise<ErrorReport[]>;
  getErrorStats(appId: number): Promise<{
    jsErrors: number;
    networkErrors: number;
    promiseRejections: number;
    formAbandonment: number;
    total: number;
  }>;
  clearErrors(appId: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  private generateApiKey(): string {
    // Generate a secure random API key: fg_ + 32 random hex chars
    return 'fg_' + randomBytes(16).toString('hex');
  }

  private async generateUniqueApiKey(): Promise<string> {
    let apiKey: string;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      apiKey = this.generateApiKey();
      attempts++;

      // Check if this API key already exists
      const existing = await db.select().from(apps).where(eq(apps.apiKey, apiKey)).limit(1);

      if (existing.length === 0) {
        return apiKey;
      }

      if (attempts >= maxAttempts) {
        throw new Error('Failed to generate unique API key after multiple attempts');
      }
    } while (true);
  }

  // User management
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // App management
  async createApp(insertApp: InsertApp): Promise<App> {
    const apiKey = await this.generateUniqueApiKey();
    const [app] = await db.insert(apps).values({
      ...insertApp,
      apiKey,
    }).returning();
    return app;
  }

  async getAppByApiKey(apiKey: string): Promise<App | undefined> {
    const [app] = await db.select().from(apps).where(eq(apps.apiKey, apiKey));
    return app || undefined;
  }

  async getAppsByUserId(userId: number): Promise<App[]> {
    return await db.select().from(apps).where(eq(apps.userId, userId));
  }

  async incrementAppErrorCount(appId: number): Promise<void> {
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get current app to check if we need to reset monthly count
    const [app] = await db.select().from(apps).where(eq(apps.id, appId));
    if (!app) return;

    let monthlyReset = {};
    if (app.lastResetDate < firstOfMonth) {
      monthlyReset = {
        monthlyErrorCount: 1,
        lastResetDate: now,
      };
    } else {
      monthlyReset = {
        monthlyErrorCount: app.monthlyErrorCount + 1,
      };
    }

    await db.update(apps)
      .set({
        errorCount: app.errorCount + 1,
        ...monthlyReset,
      })
      .where(eq(apps.id, appId));
  }

  // Error reporting
  async createErrorReport(insertErrorReport: InsertErrorReport): Promise<ErrorReport> {
    const [errorReport] = await db.insert(errorReports).values(insertErrorReport).returning();

    // Increment app error count
    await this.incrementAppErrorCount(insertErrorReport.appId);

    return errorReport;
  }

  async getErrorReports(appId: number, limit: number = 10): Promise<ErrorReport[]> {
    return await db.select()
      .from(errorReports)
      .where(eq(errorReports.appId, appId))
      .orderBy(desc(errorReports.timestamp))
      .limit(limit);
  }

  async getErrorReportsPaginated(
    appId: number, 
    page: number, 
    limit: number, 
    filters: { source?: string; type?: string; resolved?: boolean }
  ): Promise<{ errors: ErrorReport[]; total: number }> {
    const offset = (page - 1) * limit;

    let query = db
      .select()
      .from(errorReports)
      .where(eq(errorReports.appId, appId));

    let countQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(errorReports)
      .where(eq(errorReports.appId, appId));

    // Apply filters
    if (filters.source) {
      query = query.where(eq(errorReports.source, filters.source));
      countQuery = countQuery.where(eq(errorReports.source, filters.source));
    }

    if (filters.type) {
      query = query.where(eq(errorReports.type, filters.type));
      countQuery = countQuery.where(eq(errorReports.type, filters.type));
    }

    if (filters.resolved !== undefined) {
      query = query.where(eq(errorReports.resolved, filters.resolved));
      countQuery = countQuery.where(eq(errorReports.resolved, filters.resolved));
    }

    const [errors, totalResult] = await Promise.all([
      query.orderBy(desc(errorReports.timestamp)).limit(limit).offset(offset),
      countQuery
    ]);

    return {
      errors,
      total: totalResult[0]?.count || 0
    };
  }

  async cleanupOldErrors(appId: number, daysToKeep: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await db
      .delete(errorReports)
      .where(
        and(
          eq(errorReports.appId, appId),
          lt(errorReports.timestamp, cutoffDate)
        )
      );

    return result.rowCount || 0;
  }

  async clearErrors(appId: number): Promise<void> {
    await db.delete(errorReports).where(eq(errorReports.appId, appId));
  }

  async initializeDemoData(): Promise<void> {
    try {
      // Check if demo user exists
      const existingUser = await db.select().from(users).where(eq(users.username, "demo")).limit(1);

      if (existingUser.length === 0) {
        // Create demo user
        const demoUser = await this.createUser({
          username: "demo",
          password: "demo123",
          email: "demo@flowguard.dev"
        });

        console.log("Demo user created:", demoUser);

        // Create demo app with real API key
        const demoApp = await this.createApp({
          name: "Demo App",
          userId: demoUser.id,
          domain: "demo.flowguard.dev"
        });

        // Update the demo app with the specific API key we want
        await db.update(apps)
          .set({ 
            apiKey: 'fg_demo123456789abcdef123456789abcdef',
            plan: 'pro'
          })
          .where(eq(apps.id, demoApp.id));

        console.log("Demo app created with API key:", demoApp.apiKey);
      } else {
        // Get existing demo app to show API key
        const demoUser = existingUser[0];
        const existingApp = await db.select().from(apps).where(eq(apps.userId, demoUser.id)).limit(1);
        if (existingApp.length > 0) {
          console.log("Demo app API key:", existingApp[0].apiKey);
        }
      }
    } catch (error) {
      console.error("Failed to initialize demo data:", error);
    }
  }
}

export const storage = new DatabaseStorage();