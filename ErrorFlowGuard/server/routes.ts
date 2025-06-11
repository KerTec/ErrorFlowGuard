import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertErrorReportSchema, insertAppSchema, insertUserSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Middleware to authenticate API key with enhanced validation
  const authenticateApiKey = async (req: any, res: any, next: any) => {
    const apiKey = req.headers['x-api-key'] || req.query.apiKey;
    
    if (!apiKey) {
      return res.status(401).json({ 
        success: false,
        error: "API key required",
        message: "X-API-Key header is required for authentication"
      });
    }

    // Validate API key format (should start with fg_ and be proper length)
    if (typeof apiKey !== 'string' || !apiKey.startsWith('fg_') || apiKey.length !== 35) {
      return res.status(401).json({ 
        success: false,
        error: "Invalid API key format",
        message: "API key format is invalid. Expected format: fg_[32 hex chars]"
      });
    }

    try {
      const app = await storage.getAppByApiKey(apiKey as string);
      if (!app) {
        return res.status(401).json({ 
          success: false,
          error: "Invalid API key",
          message: "API key not found or has been revoked"
        });
      }

      req.app = app;
      next();
    } catch (error) {
      console.error("Authentication error:", error);
      return res.status(500).json({ 
        success: false,
        error: "Authentication failed",
        message: "Internal server error during authentication"
      });
    }
  };

  // User registration
  app.post("/api/users", async (req, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(validatedData);
      res.json({ success: true, user: { id: user.id, username: user.username, email: user.email } });
    } catch (error) {
      console.error("User creation failed:", error);
      res.status(400).json({
        success: false,
        message: error instanceof z.ZodError ? "Invalid user data" : "Failed to create user"
      });
    }
  });

  // Create new app
  app.post("/api/apps", async (req, res) => {
    try {
      const validatedData = insertAppSchema.parse(req.body);
      const app = await storage.createApp(validatedData);
      res.json({ success: true, app });
    } catch (error) {
      console.error("App creation failed:", error);
      res.status(400).json({
        success: false,
        message: error instanceof z.ZodError ? "Invalid app data" : "Failed to create app"
      });
    }
  });

  // Get apps for user
  app.get("/api/apps/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const apps = await storage.getAppsByUserId(userId);
      res.json(apps);
    } catch (error) {
      console.error("Failed to get apps:", error);
      res.status(500).json({ message: "Failed to get apps" });
    }
  });

  // Error reporting endpoint (with API key authentication and quota checking)
  app.post("/api/report", authenticateApiKey, async (req, res) => {
    try {
      const app = (req as any).app;
      
      // Check monthly quota limits
      const quotaLimits = {
        free: 10000,
        pro: 100000,
        enterprise: -1 // unlimited
      };
      
      const currentLimit = quotaLimits[app.plan as keyof typeof quotaLimits] || quotaLimits.free;
      
      if (currentLimit !== -1 && app.monthlyErrorCount >= currentLimit) {
        return res.status(429).json({
          success: false,
          error: "Quota exceeded",
          message: `Monthly error limit of ${currentLimit} reached for ${app.plan} plan`,
          quotaInfo: {
            plan: app.plan,
            used: app.monthlyErrorCount,
            limit: currentLimit,
            resetDate: app.lastResetDate
          }
        });
      }

      const validatedData = insertErrorReportSchema.parse({
        ...req.body,
        appId: app.id
      });
      
      const errorReport = await storage.createErrorReport(validatedData);
      await storage.incrementAppErrorCount(app.id);
      
      // Generate action plan based on error type
      let actionPlan = {
        retry: false,
        message: "Error logged successfully",
        suggestions: [] as string[],
      };

      switch (errorReport.source) {
        case 'fetch':
          actionPlan = {
            retry: true,
            message: "Network error detected. Retry recommended.",
            suggestions: [
              "Check network connection",
              "Verify API endpoint",
              "Implement exponential backoff"
            ]
          };
          break;
        case 'javascript':
          actionPlan = {
            retry: false,
            message: "JavaScript error detected. Manual intervention required.",
            suggestions: [
              "Check browser console",
              "Verify script dependencies",
              "Update error handling"
            ]
          };
          break;
        case 'promise':
          actionPlan = {
            retry: true,
            message: "Promise rejection detected. Consider retry with proper error handling.",
            suggestions: [
              "Add proper catch handlers",
              "Implement fallback mechanisms",
              "Log promise rejection details"
            ]
          };
          break;
        case 'form':
          actionPlan = {
            retry: false,
            message: "Form abandonment detected. Consider improving UX.",
            suggestions: [
              "Add auto-save functionality",
              "Simplify form fields",
              "Provide progress indicators"
            ]
          };
          break;
      }

      res.json({
        success: true,
        errorId: errorReport.id,
        actionPlan
      });
    } catch (error) {
      console.error("Error reporting failed:", error);
      res.status(400).json({
        success: false,
        message: error instanceof z.ZodError ? "Invalid error report data" : "Failed to log error"
      });
    }
  });

  // Get error statistics (requires API key)
  app.get("/api/errors/stats", authenticateApiKey, async (req, res) => {
    try {
      const stats = await storage.getErrorStats((req as any).app.id);
      res.json(stats);
    } catch (error) {
      console.error("Failed to get error stats:", error);
      res.status(500).json({ message: "Failed to get error statistics" });
    }
  });

  // Get recent errors with pagination and filters (requires API key)
  app.get("/api/errors", authenticateApiKey, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
      const source = req.query.source as string;
      const type = req.query.type as string;
      const resolved = req.query.resolved === 'true' ? true : req.query.resolved === 'false' ? false : undefined;
      
      const filters = {
        source,
        type,
        resolved
      };
      
      const result = await storage.getErrorReportsPaginated((req as any).app.id, page, limit, filters);
      
      res.json({
        errors: result.errors,
        pagination: {
          page,
          limit,
          total: result.total,
          totalPages: Math.ceil(result.total / limit),
          hasNext: page * limit < result.total,
          hasPrev: page > 1
        }
      });
    } catch (error) {
      console.error("Failed to get errors:", error);
      res.status(500).json({ message: "Failed to get errors" });
    }
  });

  // Clear all errors (requires API key)
  app.delete("/api/errors", authenticateApiKey, async (req, res) => {
    try {
      await storage.clearErrors((req as any).app.id);
      res.json({ success: true, message: "All errors cleared" });
    } catch (error) {
      console.error("Failed to clear errors:", error);
      res.status(500).json({ message: "Failed to clear errors" });
    }
  });

  // Get app billing information
  app.get("/api/billing", authenticateApiKey, async (req, res) => {
    try {
      const app = (req as any).app;
      res.json({
        plan: app.plan,
        totalErrors: app.errorCount,
        monthlyErrors: app.monthlyErrorCount,
        lastResetDate: app.lastResetDate,
        limits: {
          free: 10000,
          pro: 100000,
          enterprise: -1 // unlimited
        }
      });
    } catch (error) {
      console.error("Failed to get billing info:", error);
      res.status(500).json({ message: "Failed to get billing information" });
    }
  });

  // Performance test endpoint
  app.post("/api/test/load", authenticateApiKey, async (req, res) => {
    try {
      const { count = 10 } = req.body;
      const results = [];
      
      for (let i = 0; i < Math.min(count, 50); i++) {
        const testError = {
          appId: (req as any).app.id,
          type: "Load Test",
          message: `Test error ${i + 1}`,
          source: "test",
          url: "http://test.local",
          userAgent: "FlowGuard-LoadTest/1.0",
          metadata: { testIndex: i + 1, timestamp: new Date().toISOString() }
        };
        
        const errorReport = await storage.createErrorReport(testError);
        results.push(errorReport.id);
      }
      
      res.json({
        success: true,
        message: `Created ${results.length} test errors`,
        errorIds: results
      });
    } catch (error) {
      console.error("Load test failed:", error);
      res.status(500).json({ message: "Load test failed" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
