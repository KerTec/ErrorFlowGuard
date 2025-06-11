/**
 * FlowGuard SDK - Main Entry Point
 * Professional error tracking and UX monitoring solution
 */

(function() {
  'use strict';

  class FlowGuard {
    constructor() {
      this.version = '1.0.0';
      this.isInitialized = false;
      this.config = {
        apiKey: null,
        apiEndpoint: '/api/report',
        debug: false,
        autoRetry: true,
        formTracking: true,
        maxRetries: 3,
        retryDelay: 1000,
        enableStrategies: true,
        consoleLogging: false,
        context: {},
        customHandlers: {},
      };
      
      this.errorCapture = null;
      this.reporter = null;
      this.strategies = null;
      this.errorCount = 0;
      this.sessionId = this.generateSessionId();
    }

    // Initialize the SDK
    init(userConfig = {}) {
      if (this.isInitialized) {
        if (this.config.consoleLogging) {
          console.warn('FlowGuard: Already initialized');
        }
        return this;
      }

      // Merge configuration
      this.config = { ...this.config, ...userConfig };

      // Validate required configuration
      if (!this.config.apiKey) {
        throw new Error('FlowGuard: API key is required');
      }

      try {
        // Initialize modules
        this.initializeModules();

        // Set up error handling
        this.setupErrorHandling();

        // Mark as initialized
        this.isInitialized = true;

        if (this.config.consoleLogging) {
          console.log('FlowGuard SDK initialized successfully', {
            version: this.version,
            sessionId: this.sessionId,
            config: this.sanitizeConfig(this.config)
          });
        }

        // Send initialization event
        this.trackEvent('sdk_initialized', {
          version: this.version,
          sessionId: this.sessionId,
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        console.error('FlowGuard: Initialization failed', error);
        throw error;
      }

      return this;
    }

    // Initialize all modules
    initializeModules() {
      // Check if modules are loaded
      if (typeof FlowGuardErrorCapture === 'undefined') {
        throw new Error('FlowGuard: ErrorCapture module not loaded');
      }
      if (typeof FlowGuardReporter === 'undefined') {
        throw new Error('FlowGuard: Reporter module not loaded');
      }
      if (typeof FlowGuardStrategies === 'undefined') {
        throw new Error('FlowGuard: Strategies module not loaded');
      }

      // Initialize error capture
      this.errorCapture = new FlowGuardErrorCapture({
        captureJavaScript: true,
        capturePromiseRejections: true,
        captureNetworkErrors: true,
        captureFormAbandonment: this.config.formTracking,
        consoleLogging: this.config.consoleLogging,
        apiEndpoint: this.config.apiEndpoint
      });

      // Initialize reporter
      this.reporter = new FlowGuardReporter({
        apiEndpoint: this.config.apiEndpoint,
        apiKey: this.config.apiKey,
        timeout: 5000,
        retryAttempts: this.config.maxRetries,
        retryDelay: this.config.retryDelay,
        consoleLogging: this.config.consoleLogging
      });

      // Initialize strategies if enabled
      if (this.config.enableStrategies) {
        this.strategies = new FlowGuardStrategies({
          autoRetry: this.config.autoRetry,
          maxRetries: this.config.maxRetries,
          retryDelay: this.config.retryDelay,
          consoleLogging: this.config.consoleLogging
        });

        // Register custom handlers
        Object.entries(this.config.customHandlers).forEach(([source, handler]) => {
          this.strategies.registerFallback(source, handler);
        });
      }
    }

    // Set up error handling pipeline
    setupErrorHandling() {
      // Register error handler with error capture
      this.errorCapture.onError(async (errorData) => {
        await this.handleError(errorData);
      });

      // Start error capture
      this.errorCapture.start();
    }

    // Main error handling pipeline
    async handleError(errorData) {
      try {
        // Increment error count
        this.errorCount++;

        // Enrich error data
        const enrichedError = this.enrichErrorData(errorData);

        // Report error to backend
        const reportResult = await this.reporter.report(enrichedError);

        // Execute strategy if enabled and successful report
        if (this.config.enableStrategies && this.strategies && reportResult.success) {
          const strategyResult = await this.strategies.executeStrategy(
            enrichedError, 
            reportResult
          );

          if (this.config.consoleLogging) {
            console.log('FlowGuard: Strategy executed', strategyResult);
          }
        }

        // Call custom error handler if provided
        if (typeof this.config.onError === 'function') {
          this.config.onError(enrichedError, reportResult);
        }

        return reportResult;

      } catch (error) {
        if (this.config.consoleLogging) {
          console.error('FlowGuard: Error handling failed', error);
        }
      }
    }

    // Enrich error data with context and metadata
    enrichErrorData(errorData) {
      return {
        ...errorData,
        sessionId: this.sessionId,
        timestamp: new Date().toISOString(),
        context: {
          ...this.config.context,
          viewportSize: `${window.innerWidth}x${window.innerHeight}`,
          userAgent: navigator.userAgent,
          language: navigator.language,
          referrer: document.referrer,
          connectionType: this.getConnectionType(),
        },
        metadata: {
          ...errorData.metadata,
          errorCount: this.errorCount,
          sdkVersion: this.version,
        }
      };
    }

    // Manual error tracking
    trackError(message, source = 'manual', metadata = {}) {
      if (!this.isInitialized) {
        console.warn('FlowGuard: SDK not initialized');
        return;
      }

      const errorData = {
        type: 'Manual Error',
        message: message,
        source: source,
        url: window.location.href,
        userAgent: navigator.userAgent,
        metadata: metadata
      };

      return this.handleError(errorData);
    }

    // Custom event tracking
    trackEvent(eventName, data = {}) {
      if (!this.isInitialized) {
        return;
      }

      const eventData = {
        type: 'Custom Event',
        message: eventName,
        source: 'event',
        url: window.location.href,
        userAgent: navigator.userAgent,
        metadata: {
          eventName: eventName,
          eventData: data,
          timestamp: new Date().toISOString()
        }
      };

      return this.handleError(eventData);
    }

    // Set user context
    setUser(userData) {
      this.config.context.user = userData;
      
      if (this.config.consoleLogging) {
        console.log('FlowGuard: User context updated');
      }
    }

    // Set custom context
    setContext(key, value) {
      this.config.context[key] = value;
      
      if (this.config.consoleLogging) {
        console.log(`FlowGuard: Context updated - ${key}:`, value);
      }
    }

    // Set custom error handling strategy
    setStrategy(errorType, handler) {
      if (!this.strategies) {
        console.warn('FlowGuard: Strategies module not initialized');
        return;
      }
      
      this.strategies.registerFallback(errorType, handler);
      
      if (this.config.consoleLogging) {
        console.log(`FlowGuard: Custom strategy registered for ${errorType}`);
      }
    }

    // Override specific error handling
    overrideErrorHandler(source, customHandler) {
      this.config.customHandlers[source] = customHandler;
      
      if (this.config.consoleLogging) {
        console.log(`FlowGuard: Custom handler registered for ${source}`);
      }
    }

    // Update configuration
    updateConfig(newConfig) {
      this.config = { ...this.config, ...newConfig };

      // Update module configurations
      if (this.errorCapture) {
        this.errorCapture.updateConfig({
          captureFormAbandonment: this.config.formTracking,
          consoleLogging: this.config.consoleLogging
        });
      }

      if (this.reporter) {
        this.reporter.updateConfig({
          apiKey: this.config.apiKey,
          apiEndpoint: this.config.apiEndpoint,
          retryAttempts: this.config.maxRetries,
          retryDelay: this.config.retryDelay,
          consoleLogging: this.config.consoleLogging
        });
      }

      if (this.strategies) {
        this.strategies.updateConfig({
          autoRetry: this.config.autoRetry,
          maxRetries: this.config.maxRetries,
          retryDelay: this.config.retryDelay,
          consoleLogging: this.config.consoleLogging
        });
      }

      if (this.config.consoleLogging) {
        console.log('FlowGuard: Configuration updated');
      }
    }

    // Get SDK status and statistics
    getStatus() {
      return {
        version: this.version,
        initialized: this.isInitialized,
        sessionId: this.sessionId,
        errorCount: this.errorCount,
        config: this.sanitizeConfig(this.config),
        modules: {
          errorCapture: this.errorCapture ? this.errorCapture.isActive : false,
          reporter: this.reporter ? this.reporter.getQueueStatus() : null,
          strategies: this.strategies ? this.strategies.getStats() : null,
        }
      };
    }

    // Destroy the SDK instance
    destroy() {
      if (!this.isInitialized) {
        return;
      }

      // Stop error capture
      if (this.errorCapture) {
        this.errorCapture.stop();
      }

      // Clear reporter queue
      if (this.reporter) {
        this.reporter.clearQueue();
      }

      // Clear strategy attempts
      if (this.strategies) {
        this.strategies.clearRetryAttempts();
      }

      this.isInitialized = false;
      
      if (this.config.consoleLogging) {
        console.log('FlowGuard: SDK destroyed');
      }
    }

    // Utility methods
    generateSessionId() {
      return 'fg_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    getConnectionType() {
      if ('connection' in navigator) {
        return navigator.connection.effectiveType || 'unknown';
      }
      return 'unknown';
    }

    sanitizeConfig(config) {
      const sanitized = { ...config };
      if (sanitized.apiKey) {
        sanitized.apiKey = '***';
      }
      return sanitized;
    }
  }

  // Create global instance
  const flowGuard = new FlowGuard();

  // Export for different module systems
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = flowGuard;
  } else if (typeof define === 'function' && define.amd) {
    define(function() { return flowGuard; });
  } else {
    window.FlowGuard = flowGuard;
  }

  // Auto-initialize if config is provided in data attributes
  document.addEventListener('DOMContentLoaded', function() {
    const script = document.querySelector('script[data-flowguard-key]');
    if (script) {
      const apiKey = script.getAttribute('data-flowguard-key');
      const debug = script.getAttribute('data-flowguard-debug') === 'true';
      
      try {
        flowGuard.init({
          apiKey: apiKey,
          debug: debug,
          consoleLogging: debug
        });
      } catch (error) {
        console.error('FlowGuard auto-initialization failed:', error);
      }
    }
  });

})();