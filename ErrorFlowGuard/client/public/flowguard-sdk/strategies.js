/**
 * FlowGuard SDK - Strategies Module
 * Handles fallback/retry strategies and automatic error recovery
 */

class Strategies {
  constructor(config = {}) {
    this.config = {
      autoRetry: true,
      maxRetries: 3,
      retryDelay: 1000,
      exponentialBackoff: true,
      retryableErrors: ['fetch', 'promise'],
      fallbackStrategies: {
        fetch: 'retry',
        javascript: 'log',
        promise: 'retry',
        form: 'save'
      },
      consoleLogging: false,
      ...config
    };
    
    this.retryAttempts = new Map();
    this.fallbackHandlers = new Map();
    this.activeStrategies = new Set();
  }

  // Register custom fallback handler
  registerFallback(errorSource, handler) {
    this.fallbackHandlers.set(errorSource, handler);
    
    if (this.config.consoleLogging) {
      console.log(`FlowGuard Strategies: Registered fallback for ${errorSource}`);
    }
  }

  // Execute strategy based on error data and server response
  async executeStrategy(errorData, serverResponse = null) {
    const strategy = this.determineStrategy(errorData, serverResponse);
    
    if (this.config.consoleLogging) {
      console.log(`FlowGuard Strategies: Executing ${strategy} for ${errorData.source}`, errorData);
    }
    
    switch (strategy) {
      case 'retry':
        return this.executeRetryStrategy(errorData);
      
      case 'fallback':
        return this.executeFallbackStrategy(errorData);
      
      case 'save':
        return this.executeSaveStrategy(errorData);
      
      case 'reload':
        return this.executeReloadStrategy(errorData);
      
      case 'log':
      default:
        return this.executeLogStrategy(errorData);
    }
  }

  // Determine which strategy to use
  determineStrategy(errorData, serverResponse) {
    // Use server recommendation if available
    if (serverResponse?.actionPlan?.retry && this.config.autoRetry) {
      return 'retry';
    }
    
    // Use configured strategy for error source
    const configuredStrategy = this.config.fallbackStrategies[errorData.source];
    if (configuredStrategy) {
      return configuredStrategy;
    }
    
    // Default strategies based on error type
    switch (errorData.source) {
      case 'fetch':
        return this.isRetryableNetworkError(errorData) ? 'retry' : 'fallback';
      
      case 'javascript':
        return this.isCriticalJSError(errorData) ? 'reload' : 'log';
      
      case 'promise':
        return 'retry';
      
      case 'form':
        return 'save';
      
      default:
        return 'log';
    }
  }

  // Retry strategy implementation
  async executeRetryStrategy(errorData) {
    const retryKey = this.generateRetryKey(errorData);
    const currentAttempts = this.retryAttempts.get(retryKey) || 0;
    
    if (currentAttempts >= this.config.maxRetries) {
      if (this.config.consoleLogging) {
        console.log(`FlowGuard Strategies: Max retries reached for ${retryKey}`);
      }
      
      // Try fallback strategy instead
      return this.executeFallbackStrategy(errorData);
    }
    
    const delay = this.calculateRetryDelay(currentAttempts);
    this.retryAttempts.set(retryKey, currentAttempts + 1);
    
    if (this.config.consoleLogging) {
      console.log(`FlowGuard Strategies: Retrying in ${delay}ms (attempt ${currentAttempts + 1}/${this.config.maxRetries})`);
    }
    
    return new Promise((resolve) => {
      setTimeout(async () => {
        try {
          const result = await this.performRetry(errorData);
          
          if (result.success) {
            this.retryAttempts.delete(retryKey);
            
            if (this.config.consoleLogging) {
              console.log(`FlowGuard Strategies: Retry successful for ${retryKey}`);
            }
          }
          
          resolve(result);
        } catch (error) {
          if (this.config.consoleLogging) {
            console.error(`FlowGuard Strategies: Retry failed for ${retryKey}`, error);
          }
          
          resolve({ success: false, error: error.message });
        }
      }, delay);
    });
  }

  // Perform the actual retry based on error type
  async performRetry(errorData) {
    switch (errorData.source) {
      case 'fetch':
        return this.retryNetworkRequest(errorData);
      
      case 'promise':
        return this.retryPromiseOperation(errorData);
      
      default:
        return { success: false, error: 'Retry not supported for this error type' };
    }
  }

  // Retry network request
  async retryNetworkRequest(errorData) {
    const requestUrl = errorData.metadata?.requestUrl;
    const method = errorData.metadata?.method || 'GET';
    
    if (!requestUrl) {
      return { success: false, error: 'No request URL available for retry' };
    }
    
    try {
      const response = await fetch(requestUrl, { method });
      
      if (response.ok) {
        return { success: true, response: response.status };
      } else {
        return { success: false, error: `HTTP ${response.status}` };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Retry promise operation (limited - mainly for logging)
  async retryPromiseOperation(errorData) {
    // For promise rejections, we can't actually retry the original operation
    // This is mainly for logging and potential custom handlers
    
    const customHandler = this.fallbackHandlers.get('promise');
    if (customHandler) {
      try {
        const result = await customHandler(errorData);
        return { success: true, result };
      } catch (error) {
        return { success: false, error: error.message };
      }
    }
    
    return { success: false, error: 'No retry mechanism available for promise rejections' };
  }

  // Fallback strategy implementation
  async executeFallbackStrategy(errorData) {
    const customHandler = this.fallbackHandlers.get(errorData.source);
    
    if (customHandler) {
      try {
        const result = await customHandler(errorData);
        
        if (this.config.consoleLogging) {
          console.log(`FlowGuard Strategies: Custom fallback executed for ${errorData.source}`, result);
        }
        
        return { success: true, result };
      } catch (error) {
        if (this.config.consoleLogging) {
          console.error(`FlowGuard Strategies: Custom fallback failed for ${errorData.source}`, error);
        }
        
        return { success: false, error: error.message };
      }
    }
    
    // Default fallback behaviors
    switch (errorData.source) {
      case 'fetch':
        return this.networkFallback(errorData);
      
      case 'javascript':
        return this.javascriptFallback(errorData);
      
      default:
        return this.executeLogStrategy(errorData);
    }
  }

  // Network fallback (cached response, alternative endpoint, etc.)
  async networkFallback(errorData) {
    // Try to get cached response
    const cachedResponse = this.getCachedResponse(errorData.metadata?.requestUrl);
    
    if (cachedResponse) {
      if (this.config.consoleLogging) {
        console.log('FlowGuard Strategies: Using cached response for network fallback');
      }
      
      return { success: true, result: 'cached_response', data: cachedResponse };
    }
    
    // Could implement alternative endpoints, degraded functionality, etc.
    return { success: false, error: 'No fallback available for network error' };
  }

  // JavaScript fallback (error boundaries, safe mode, etc.)
  async javascriptFallback(errorData) {
    // Log error and continue execution
    if (this.config.consoleLogging) {
      console.log('FlowGuard Strategies: JavaScript fallback - logging and continuing');
    }
    
    return { success: true, result: 'logged_and_continued' };
  }

  // Save strategy for form abandonment
  async executeSaveStrategy(errorData) {
    try {
      const formData = this.extractFormData();
      
      if (formData && Object.keys(formData).length > 0) {
        // Save to localStorage
        const saveKey = `flowguard_form_${window.location.pathname}_${Date.now()}`;
        localStorage.setItem(saveKey, JSON.stringify({
          data: formData,
          timestamp: new Date().toISOString(),
          url: window.location.href,
        }));
        
        if (this.config.consoleLogging) {
          console.log('FlowGuard Strategies: Form data saved to localStorage', saveKey);
        }
        
        return { success: true, result: 'form_saved', key: saveKey };
      }
      
      return { success: false, error: 'No form data to save' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Reload strategy for critical errors
  async executeReloadStrategy(errorData) {
    if (this.config.consoleLogging) {
      console.log('FlowGuard Strategies: Critical error detected, suggesting page reload');
    }
    
    // Don't automatically reload, just suggest it
    return { 
      success: true, 
      result: 'reload_suggested',
      message: 'A critical error occurred. Consider refreshing the page.'
    };
  }

  // Log strategy (default)
  async executeLogStrategy(errorData) {
    if (this.config.consoleLogging) {
      console.log('FlowGuard Strategies: Error logged', errorData);
    }
    
    return { success: true, result: 'logged' };
  }

  // Helper methods
  generateRetryKey(errorData) {
    return `${errorData.source}-${errorData.metadata?.requestUrl || errorData.url}-${errorData.type}`;
  }

  calculateRetryDelay(attemptNumber) {
    if (this.config.exponentialBackoff) {
      return this.config.retryDelay * Math.pow(2, attemptNumber);
    }
    return this.config.retryDelay;
  }

  isRetryableNetworkError(errorData) {
    const status = errorData.metadata?.status;
    // Retry on server errors (5xx) and some client errors
    return !status || status >= 500 || status === 408 || status === 429;
  }

  isCriticalJSError(errorData) {
    const message = errorData.message?.toLowerCase() || '';
    const criticalKeywords = ['script error', 'out of memory', 'maximum call stack'];
    return criticalKeywords.some(keyword => message.includes(keyword));
  }

  extractFormData() {
    const formData = {};
    const forms = document.querySelectorAll('form');
    
    forms.forEach(form => {
      const inputs = form.querySelectorAll('input, textarea, select');
      
      inputs.forEach(input => {
        if (input.name && input.value && input.type !== 'password') {
          formData[input.name] = input.value;
        }
      });
    });
    
    return formData;
  }

  getCachedResponse(url) {
    // Simple localStorage-based cache
    try {
      const cacheKey = `flowguard_cache_${url}`;
      const cached = localStorage.getItem(cacheKey);
      
      if (cached) {
        const parsedCache = JSON.parse(cached);
        const maxAge = 5 * 60 * 1000; // 5 minutes
        
        if (Date.now() - parsedCache.timestamp < maxAge) {
          return parsedCache.data;
        } else {
          localStorage.removeItem(cacheKey);
        }
      }
    } catch (error) {
      // Ignore cache errors
    }
    
    return null;
  }

  // Update configuration
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    
    if (this.config.consoleLogging) {
      console.log('FlowGuard Strategies: Configuration updated', this.config);
    }
  }

  // Clear retry attempts
  clearRetryAttempts() {
    this.retryAttempts.clear();
    
    if (this.config.consoleLogging) {
      console.log('FlowGuard Strategies: Retry attempts cleared');
    }
  }

  // Get strategy statistics
  getStats() {
    return {
      activeRetries: this.retryAttempts.size,
      registeredFallbacks: this.fallbackHandlers.size,
      activeStrategies: Array.from(this.activeStrategies),
    };
  }
}

// Export for both CommonJS and ES modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Strategies;
} else {
  window.FlowGuardStrategies = Strategies;
}