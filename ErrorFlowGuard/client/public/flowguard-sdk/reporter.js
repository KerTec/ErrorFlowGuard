/**
 * FlowGuard SDK - Reporter Module
 * Handles sending error reports to the backend
 */

class Reporter {
  constructor(config = {}) {
    this.config = {
      apiEndpoint: '/api/report',
      apiKey: null,
      timeout: 5000,
      retryAttempts: 3,
      retryDelay: 1000,
      consoleLogging: false,
      ...config
    };
    
    this.queue = [];
    this.isOnline = navigator.onLine;
    this.retryTimeouts = new Map();
    
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.processQueue();
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  // Send error report to backend
  async report(errorData) {
    if (!this.config.apiKey) {
      if (this.config.consoleLogging) {
        console.warn('FlowGuard Reporter: No API key configured, cannot send report');
      }
      return { success: false, error: 'No API key configured' };
    }

    // Demo mode detection
    if (this.config.apiKey === 'demo_key_12345' || this.config.apiKey.startsWith('demo_')) {
      if (this.config.consoleLogging) {
        console.log('FlowGuard Reporter: Demo mode - simulating successful report', errorData);
      }
      return { 
        success: true, 
        errorId: 'demo_' + Date.now(),
        actionPlan: { 
          retry: errorData.source === 'fetch',
          message: `Demo: ${errorData.source} error captured successfully`,
          suggestions: [`Demo suggestion for ${errorData.type}`]
        }
      };
    }

    // Add to queue if offline
    if (!this.isOnline) {
      this.queue.push(errorData);
      if (this.config.consoleLogging) {
        console.log('FlowGuard Reporter: Added to queue (offline)', errorData);
      }
      return { success: false, error: 'Offline - added to queue' };
    }

    try {
      const response = await this.sendRequest(errorData);
      
      if (this.config.consoleLogging) {
        console.log('FlowGuard Reporter: Successfully sent error report', response);
      }
      
      return response;
    } catch (error) {
      if (this.config.consoleLogging) {
        console.error('FlowGuard Reporter: Failed to send error report', error);
      }
      
      // Add to queue for retry
      this.queue.push(errorData);
      this.scheduleRetry(errorData);
      
      return { success: false, error: error.message };
    }
  }

  // Send HTTP request with timeout and headers
  async sendRequest(errorData, retryCount = 0) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
    
    try {
      const response = await fetch(this.config.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.config.apiKey,
        },
        body: JSON.stringify(errorData),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      return { success: true, ...result };
    } catch (error) {
      clearTimeout(timeoutId);
      
      // Retry logic
      if (retryCount < this.config.retryAttempts) {
        if (this.config.consoleLogging) {
          console.log(`FlowGuard Reporter: Retrying request (${retryCount + 1}/${this.config.retryAttempts})`);
        }
        
        await this.delay(this.config.retryDelay * (retryCount + 1));
        return this.sendRequest(errorData, retryCount + 1);
      }
      
      throw error;
    }
  }

  // Schedule retry for failed requests
  scheduleRetry(errorData) {
    const retryKey = JSON.stringify(errorData);
    
    // Clear existing retry if any
    if (this.retryTimeouts.has(retryKey)) {
      clearTimeout(this.retryTimeouts.get(retryKey));
    }
    
    const timeoutId = setTimeout(async () => {
      if (this.isOnline) {
        try {
          await this.sendRequest(errorData);
          
          // Remove from queue if successful
          const index = this.queue.findIndex(item => JSON.stringify(item) === retryKey);
          if (index > -1) {
            this.queue.splice(index, 1);
          }
        } catch (error) {
          if (this.config.consoleLogging) {
            console.error('FlowGuard Reporter: Retry failed', error);
          }
        }
      }
      
      this.retryTimeouts.delete(retryKey);
    }, this.config.retryDelay * 2);
    
    this.retryTimeouts.set(retryKey, timeoutId);
  }

  // Process queued requests when back online
  async processQueue() {
    if (!this.isOnline || this.queue.length === 0) {
      return;
    }
    
    if (this.config.consoleLogging) {
      console.log(`FlowGuard Reporter: Processing ${this.queue.length} queued requests`);
    }
    
    const queueCopy = [...this.queue];
    this.queue = [];
    
    for (const errorData of queueCopy) {
      try {
        await this.sendRequest(errorData);
      } catch (error) {
        // Re-add to queue if still failing
        this.queue.push(errorData);
        
        if (this.config.consoleLogging) {
          console.error('FlowGuard Reporter: Failed to process queued request', error);
        }
      }
      
      // Small delay between requests to avoid overwhelming the server
      await this.delay(100);
    }
  }

  // Send critical error using sendBeacon (for page unload)
  sendBeacon(errorData) {
    if (!this.config.apiKey || !navigator.sendBeacon) {
      return false;
    }
    
    const data = JSON.stringify(errorData);
    const headers = new Headers();
    headers.append('Content-Type', 'application/json');
    headers.append('X-API-Key', this.config.apiKey);
    
    // Create a Blob with headers (limited browser support)
    const blob = new Blob([data], { type: 'application/json' });
    
    try {
      return navigator.sendBeacon(this.config.apiEndpoint, blob);
    } catch (error) {
      if (this.config.consoleLogging) {
        console.error('FlowGuard Reporter: sendBeacon failed', error);
      }
      return false;
    }
  }

  // Utility: delay function
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Update configuration
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    
    if (this.config.consoleLogging) {
      console.log('FlowGuard Reporter: Configuration updated', this.config);
    }
  }

  // Get queue status
  getQueueStatus() {
    return {
      queueLength: this.queue.length,
      isOnline: this.isOnline,
      pendingRetries: this.retryTimeouts.size,
    };
  }

  // Clear queue
  clearQueue() {
    this.queue = [];
    
    // Clear all pending retries
    this.retryTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
    this.retryTimeouts.clear();
    
    if (this.config.consoleLogging) {
      console.log('FlowGuard Reporter: Queue cleared');
    }
  }
}

// Export for both CommonJS and ES modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Reporter;
} else {
  window.FlowGuardReporter = Reporter;
}