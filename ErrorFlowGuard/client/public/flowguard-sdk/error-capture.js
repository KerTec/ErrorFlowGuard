/**
 * FlowGuard SDK - Error Capture Module
 * Centralizes all error detection and capture logic
 */

class ErrorCapture {
  constructor(config = {}) {
    this.config = {
      captureJavaScript: true,
      capturePromiseRejections: true,
      captureNetworkErrors: true,
      captureFormAbandonment: true,
      consoleLogging: false,
      ...config
    };
    
    this.originalFetch = window.fetch;
    this.formModified = false;
    this.errorHandlers = [];
    this.isActive = false;
  }

  // Register error handler callback
  onError(callback) {
    this.errorHandlers.push(callback);
  }

  // Emit error to all registered handlers
  emitError(errorData) {
    this.errorHandlers.forEach(handler => {
      try {
        handler(errorData);
      } catch (err) {
        if (this.config.consoleLogging) {
          console.error('FlowGuard: Error handler failed', err);
        }
      }
    });
  }

  // Start capturing errors
  start() {
    if (this.isActive) return;
    
    if (this.config.captureJavaScript) {
      this.setupJavaScriptErrorCapture();
    }
    
    if (this.config.capturePromiseRejections) {
      this.setupPromiseRejectionCapture();
    }
    
    if (this.config.captureNetworkErrors) {
      this.setupNetworkErrorCapture();
    }
    
    if (this.config.captureFormAbandonment) {
      this.setupFormAbandonmentCapture();
    }
    
    this.isActive = true;
    
    if (this.config.consoleLogging) {
      console.log('FlowGuard ErrorCapture: Started capturing errors');
    }
  }

  // Stop capturing errors
  stop() {
    if (!this.isActive) return;
    
    // Remove JavaScript error listeners
    window.removeEventListener('error', this.handleJavaScriptError);
    
    // Remove promise rejection listeners
    window.removeEventListener('unhandledrejection', this.handlePromiseRejection);
    
    // Restore original fetch
    window.fetch = this.originalFetch;
    
    // Remove form listeners
    document.removeEventListener('input', this.handleFormInput);
    document.removeEventListener('submit', this.handleFormSubmit);
    window.removeEventListener('beforeunload', this.handleBeforeUnload);
    
    this.isActive = false;
    
    if (this.config.consoleLogging) {
      console.log('FlowGuard ErrorCapture: Stopped capturing errors');
    }
  }

  // JavaScript error capture
  setupJavaScriptErrorCapture() {
    this.handleJavaScriptError = (event) => {
      const errorData = {
        type: 'JavaScript Error',
        message: event.message,
        source: 'javascript',
        url: window.location.href,
        userAgent: navigator.userAgent,
        stackTrace: event.error?.stack,
        metadata: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          timestamp: new Date().toISOString(),
        }
      };
      
      if (this.config.consoleLogging) {
        console.error('FlowGuard captured JavaScript error:', errorData);
      }
      
      this.emitError(errorData);
    };
    
    window.addEventListener('error', this.handleJavaScriptError);
  }

  // Promise rejection capture
  setupPromiseRejectionCapture() {
    this.handlePromiseRejection = (event) => {
      const errorData = {
        type: 'Unhandled Promise Rejection',
        message: event.reason?.message || String(event.reason),
        source: 'promise',
        url: window.location.href,
        userAgent: navigator.userAgent,
        stackTrace: event.reason?.stack,
        metadata: {
          reason: event.reason,
          timestamp: new Date().toISOString(),
        }
      };
      
      if (this.config.consoleLogging) {
        console.error('FlowGuard captured promise rejection:', errorData);
      }
      
      this.emitError(errorData);
    };
    
    window.addEventListener('unhandledrejection', this.handlePromiseRejection);
  }

  // Network error capture
  setupNetworkErrorCapture() {
    const self = this;
    
    window.fetch = async function(...args) {
      try {
        const response = await self.originalFetch(...args);
        
        if (!response.ok) {
          const errorData = {
            type: 'Network Error',
            message: `HTTP ${response.status}: ${response.statusText}`,
            source: 'fetch',
            url: window.location.href,
            userAgent: navigator.userAgent,
            metadata: {
              requestUrl: typeof args[0] === 'string' ? args[0] : args[0]?.url,
              method: args[1]?.method || 'GET',
              status: response.status,
              statusText: response.statusText,
              timestamp: new Date().toISOString(),
            }
          };
          
          if (self.config.consoleLogging) {
            console.error('FlowGuard captured fetch error:', errorData);
          }
          
          self.emitError(errorData);
        }
        
        return response;
      } catch (error) {
        const errorData = {
          type: 'Network Error',
          message: error.message || String(error),
          source: 'fetch',
          url: window.location.href,
          userAgent: navigator.userAgent,
          stackTrace: error.stack,
          metadata: {
            requestUrl: typeof args[0] === 'string' ? args[0] : args[0]?.url,
            method: args[1]?.method || 'GET',
            timestamp: new Date().toISOString(),
          }
        };
        
        if (self.config.consoleLogging) {
          console.error('FlowGuard captured fetch error:', errorData);
        }
        
        self.emitError(errorData);
        throw error;
      }
    };
  }

  // Form abandonment capture
  setupFormAbandonmentCapture() {
    this.handleFormInput = () => {
      this.formModified = true;
    };
    
    this.handleFormSubmit = () => {
      this.formModified = false;
    };
    
    this.handleBeforeUnload = () => {
      if (this.formModified) {
        const errorData = {
          type: 'Form Abandonment',
          message: 'User left page with unsaved form data',
          source: 'form',
          url: window.location.href,
          userAgent: navigator.userAgent,
          metadata: {
            formElements: document.querySelectorAll('form input, form textarea, form select').length,
            timestamp: new Date().toISOString(),
          }
        };
        
        // Use sendBeacon for reliable reporting on page unload
        if (navigator.sendBeacon && this.config.apiEndpoint) {
          navigator.sendBeacon(this.config.apiEndpoint, JSON.stringify(errorData));
        } else {
          // Emit for other handlers
          this.emitError(errorData);
        }
      }
    };
    
    document.addEventListener('input', this.handleFormInput);
    document.addEventListener('submit', this.handleFormSubmit);
    window.addEventListener('beforeunload', this.handleBeforeUnload);
  }

  // Update configuration
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    
    if (this.config.consoleLogging) {
      console.log('FlowGuard ErrorCapture: Configuration updated', this.config);
    }
  }
}

// Export for both CommonJS and ES modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ErrorCapture;
} else {
  window.FlowGuardErrorCapture = ErrorCapture;
}