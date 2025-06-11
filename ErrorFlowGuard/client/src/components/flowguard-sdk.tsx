import { useEffect, useRef } from "react";
import { apiRequest } from "@/lib/queryClient";

interface FlowGuardConfig {
  apiEndpoint?: string;
  autoRetry?: boolean;
  formTracking?: boolean;
  consoleLogging?: boolean;
  maxRetries?: number;
  retryDelay?: number;
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

class FlowGuardSDK {
  private config: Required<FlowGuardConfig>;
  private isInitialized = false;
  private errorCount = 0;
  private formModified = false;
  private originalFetch: typeof fetch;
  private retryAttempts = new Map<string, number>();

  constructor(config: FlowGuardConfig = {}) {
    this.config = {
      apiEndpoint: '/api/report',
      autoRetry: true,
      formTracking: true,
      consoleLogging: true,
      maxRetries: 3,
      retryDelay: 1000,
      ...config,
    };
    this.originalFetch = window.fetch;
  }

  async reportError(errorData: ErrorReport): Promise<void> {
    try {
      const response = await apiRequest("POST", this.config.apiEndpoint, errorData);
      const result = await response.json();
      
      if (result.success) {
        this.errorCount++;
        
        if (this.config.consoleLogging) {
          console.log(`FlowGuard: Error reported successfully`, {
            errorId: result.errorId,
            actionPlan: result.actionPlan,
          });
        }
        
        // Handle auto-retry logic
        if (result.actionPlan?.retry && this.config.autoRetry && errorData.source === 'fetch') {
          this.handleAutoRetry(errorData);
        }
        
        // Dispatch custom event for UI updates
        window.dispatchEvent(new CustomEvent('flowguard:error-reported', {
          detail: { errorData, result }
        }));
      }
    } catch (error) {
      if (this.config.consoleLogging) {
        console.error("FlowGuard: Failed to report error", error);
      }
    }
  }

  private async handleAutoRetry(errorData: ErrorReport): Promise<void> {
    const requestKey = JSON.stringify(errorData.metadata?.requestUrl || errorData.url);
    const attempts = this.retryAttempts.get(requestKey) || 0;
    
    if (attempts < this.config.maxRetries) {
      this.retryAttempts.set(requestKey, attempts + 1);
      
      if (this.config.consoleLogging) {
        console.log(`FlowGuard: Auto-retry attempt ${attempts + 1}/${this.config.maxRetries} for ${requestKey}`);
      }
      
      setTimeout(() => {
        // Attempt to retry the original request if possible
        // This is a simplified retry mechanism
        if (errorData.metadata?.requestUrl) {
          fetch(errorData.metadata.requestUrl)
            .then(() => {
              this.retryAttempts.delete(requestKey);
              if (this.config.consoleLogging) {
                console.log(`FlowGuard: Auto-retry successful for ${requestKey}`);
              }
            })
            .catch(() => {
              if (this.config.consoleLogging) {
                console.log(`FlowGuard: Auto-retry failed for ${requestKey}`);
              }
            });
        }
      }, this.config.retryDelay * (attempts + 1));
    } else {
      this.retryAttempts.delete(requestKey);
      if (this.config.consoleLogging) {
        console.log(`FlowGuard: Max retries reached for ${requestKey}`);
      }
    }
  }

  private handleError = (event: ErrorEvent): void => {
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
        timestamp: new Date().toISOString(),
      },
    };
    
    if (this.config.consoleLogging) {
      console.error("FlowGuard captured JavaScript error:", errorData);
    }
    
    this.reportError(errorData);
  };

  private handleUnhandledRejection = (event: PromiseRejectionEvent): void => {
    const errorData: ErrorReport = {
      type: "Unhandled Promise Rejection",
      message: event.reason?.message || String(event.reason),
      source: "promise",
      url: window.location.href,
      userAgent: navigator.userAgent,
      stackTrace: event.reason?.stack,
      metadata: {
        reason: event.reason,
        timestamp: new Date().toISOString(),
      },
    };
    
    if (this.config.consoleLogging) {
      console.error("FlowGuard captured promise rejection:", errorData);
    }
    
    this.reportError(errorData);
  };

  private wrapFetch(): void {
    window.fetch = async (...args) => {
      try {
        const response = await this.originalFetch(...args);
        
        if (!response.ok) {
          const errorData: ErrorReport = {
            type: "Network Error",
            message: `HTTP ${response.status}: ${response.statusText}`,
            source: "fetch",
            url: window.location.href,
            userAgent: navigator.userAgent,
            metadata: {
              requestUrl: typeof args[0] === 'string' ? args[0] : args[0]?.url,
              method: args[1]?.method || 'GET',
              status: response.status,
              statusText: response.statusText,
              timestamp: new Date().toISOString(),
            },
          };
          
          if (this.config.consoleLogging) {
            console.error("FlowGuard captured fetch error:", errorData);
          }
          
          this.reportError(errorData);
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
            requestUrl: typeof args[0] === 'string' ? args[0] : args[0]?.url,
            method: args[1]?.method || 'GET',
            timestamp: new Date().toISOString(),
          },
        };
        
        if (this.config.consoleLogging) {
          console.error("FlowGuard captured fetch error:", errorData);
        }
        
        this.reportError(errorData);
        throw error;
      }
    };
  }

  private setupFormTracking(): void {
    if (!this.config.formTracking) return;

    const handleFormInput = (): void => {
      this.formModified = true;
    };
    
    const handleFormSubmit = (): void => {
      this.formModified = false;
    };
    
    const handleBeforeUnload = (): void => {
      if (this.formModified) {
        const errorData: ErrorReport = {
          type: "Form Abandonment",
          message: "User left page with unsaved form data",
          source: "form",
          url: window.location.href,
          userAgent: navigator.userAgent,
          metadata: {
            formElements: document.querySelectorAll('form input, form textarea, form select').length,
            timestamp: new Date().toISOString(),
          },
        };
        
        // Use sendBeacon for reliable reporting on page unload
        const data = JSON.stringify(errorData);
        if (navigator.sendBeacon) {
          navigator.sendBeacon(this.config.apiEndpoint, data);
        } else {
          // Fallback for browsers that don't support sendBeacon
          this.reportError(errorData);
        }
      }
    };
    
    document.addEventListener('input', handleFormInput);
    document.addEventListener('submit', handleFormSubmit);
    window.addEventListener('beforeunload', handleBeforeUnload);
  }

  initialize(): void {
    if (this.isInitialized) {
      if (this.config.consoleLogging) {
        console.warn("FlowGuard SDK is already initialized");
      }
      return;
    }

    // Set up global error handlers
    window.addEventListener('error', this.handleError);
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection);

    // Wrap fetch for network error tracking
    this.wrapFetch();

    // Set up form tracking
    this.setupFormTracking();

    this.isInitialized = true;
    
    if (this.config.consoleLogging) {
      console.log("FlowGuard SDK initialized successfully", {
        config: this.config,
        version: "1.0.0",
      });
    }

    // Dispatch initialization event
    window.dispatchEvent(new CustomEvent('flowguard:initialized', {
      detail: { config: this.config }
    }));
  }

  destroy(): void {
    if (!this.isInitialized) return;

    // Remove event listeners
    window.removeEventListener('error', this.handleError);
    window.removeEventListener('unhandledrejection', this.handleUnhandledRejection);

    // Restore original fetch
    window.fetch = this.originalFetch;

    // Clear retry attempts
    this.retryAttempts.clear();

    this.isInitialized = false;
    
    if (this.config.consoleLogging) {
      console.log("FlowGuard SDK destroyed");
    }
  }

  updateConfig(newConfig: Partial<FlowGuardConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (this.config.consoleLogging) {
      console.log("FlowGuard SDK configuration updated", this.config);
    }
  }

  getErrorCount(): number {
    return this.errorCount;
  }

  isReady(): boolean {
    return this.isInitialized;
  }
}

// React component wrapper for the SDK
interface FlowGuardSDKProps {
  config?: FlowGuardConfig;
  onError?: (errorData: ErrorReport, result: any) => void;
  onInitialized?: (config: FlowGuardConfig) => void;
}

export function FlowGuardSDKComponent({ config, onError, onInitialized }: FlowGuardSDKProps) {
  const sdkRef = useRef<FlowGuardSDK | null>(null);

  useEffect(() => {
    // Initialize SDK
    sdkRef.current = new FlowGuardSDK(config);
    sdkRef.current.initialize();

    // Set up event listeners
    const handleErrorReported = (event: CustomEvent) => {
      if (onError) {
        onError(event.detail.errorData, event.detail.result);
      }
    };

    const handleInitialized = (event: CustomEvent) => {
      if (onInitialized) {
        onInitialized(event.detail.config);
      }
    };

    window.addEventListener('flowguard:error-reported', handleErrorReported as EventListener);
    window.addEventListener('flowguard:initialized', handleInitialized as EventListener);

    // Cleanup
    return () => {
      window.removeEventListener('flowguard:error-reported', handleErrorReported as EventListener);
      window.removeEventListener('flowguard:initialized', handleInitialized as EventListener);
      
      if (sdkRef.current) {
        sdkRef.current.destroy();
      }
    };
  }, [config, onError, onInitialized]);

  // Update config when it changes
  useEffect(() => {
    if (sdkRef.current && config) {
      sdkRef.current.updateConfig(config);
    }
  }, [config]);

  return null; // This component doesn't render anything
}

// Export both the SDK class and the component
export { FlowGuardSDK };
export default FlowGuardSDKComponent;
