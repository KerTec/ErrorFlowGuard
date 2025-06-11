import { useState, useCallback, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface FlowGuardConfig {
  autoRetry: boolean;
  formTracking: boolean;
  consoleLogging: boolean;
}

interface ErrorReport {
  type: string;
  message: string;
  source: string;
  url: string;
  userAgent: string;
  stackTrace?: string;
  metadata?: any;
}

export function useFlowGuard() {
  const [errorCount, setErrorCount] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);
  const { toast } = useToast();

  const reportError = useCallback(async (errorData: ErrorReport) => {
    try {
      const response = await apiRequest("POST", "/api/report", errorData);
      const result = await response.json();

      if (result.success) {
        setErrorCount(prev => prev + 1);

        if (result.actionPlan?.message) {
          toast({
            title: "Error Captured",
            description: result.actionPlan.message,
            variant: errorData.source === 'fetch' ? "default" : "destructive",
          });
        }

        // Auto-retry logic for network errors
        if (result.actionPlan?.retry && errorData.source === 'fetch') {
          console.log("FlowGuard: Auto-retry recommended for network error");
        }
      }
    } catch (error) {
      console.error("FlowGuard: Failed to report error", error);
    }
  }, [toast]);

  const initializeSDK = useCallback((config: FlowGuardConfig & { apiKey?: string }) => {
    if (isInitialized) return;

    // Global error handler
    const handleError = (event: ErrorEvent) => {
      const errorData: ErrorReport = {
        type: "JavaScript Error",
        message: event.message,
        source: "javascript",
        url: window.location.href,
        userAgent: navigator.userAgent,
        stackTrace: event.error?.stack,
        metadata: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      };

      if (config.consoleLogging) {
        console.error("FlowGuard captured error:", errorData);
      }

      reportError(errorData);
    };

    // Unhandled promise rejection handler
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const errorData: ErrorReport = {
        type: "Unhandled Promise Rejection",
        message: event.reason?.message || String(event.reason),
        source: "promise",
        url: window.location.href,
        userAgent: navigator.userAgent,
        stackTrace: event.reason?.stack,
        metadata: {
          reason: event.reason,
        },
      };

      if (config.consoleLogging) {
        console.error("FlowGuard captured promise rejection:", errorData);
      }

      reportError(errorData);
    };

    // Fetch wrapper for network errors
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);

        if (!response.ok) {
          const errorData: ErrorReport = {
            type: "Network Error",
            message: `HTTP ${response.status}: ${response.statusText}`,
            source: "fetch",
            url: window.location.href,
            userAgent: navigator.userAgent,
            metadata: {
              requestUrl: args[0],
              status: response.status,
              statusText: response.statusText,
            },
          };

          if (config.consoleLogging) {
            console.error("FlowGuard captured fetch error:", errorData);
          }

          reportError(errorData);
        }

        return response;
      } catch (error) {
        const errorData: ErrorReport = {
          type: "Network Error",
          message: error instanceof Error ? error.message : String(error),
          source: "fetch",
          url: window.location.href,
          userAgent: navigator.userAgent,
          stackTrace: error instanceof Error ? error.stack : undefined,
          metadata: {
            requestUrl: args[0],
          },
        };

        if (config.consoleLogging) {
          console.error("FlowGuard captured fetch error:", errorData);
        }

        reportError(errorData);
        throw error;
      }
    };

    // Form abandonment tracking
    if (config.formTracking) {
      let formModified = false;

      const handleFormInput = () => {
        formModified = true;
      };

      const handleFormSubmit = () => {
        formModified = false;
      };

      const handleBeforeUnload = () => {
        if (formModified) {
          const errorData: ErrorReport = {
            type: "Form Abandonment",
            message: "User left page with unsaved form data",
            source: "form",
            url: window.location.href,
            userAgent: navigator.userAgent,
            metadata: {
              formElements: document.querySelectorAll('form input, form textarea, form select').length,
            },
          };

          // Use sendBeacon for reliable reporting on page unload
          navigator.sendBeacon('/api/report', JSON.stringify(errorData));
        }
      };

      document.addEventListener('input', handleFormInput);
      document.addEventListener('submit', handleFormSubmit);
      window.addEventListener('beforeunload', handleBeforeUnload);
    }

    // Set up event listeners
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    setIsInitialized(true);

    if (config.consoleLogging) {
      console.log("FlowGuard SDK initialized with config:", config);
    }

    toast({
      title: "FlowGuard SDK",
      description: "Error tracking initialized successfully",
    });
  }, [isInitialized, reportError, toast]);

  return {
    initializeSDK,
    errorCount,
    isInitialized,
  };
}