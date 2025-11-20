/**
 * Monitoring and Observability for Summit CLI
 *
 * Provides hooks for collecting metrics, tracing command execution,
 * and reporting errors. Designed to be lightweight and non-intrusive.
 *
 * Features:
 * - Command duration tracking
 * - Error rate monitoring
 * - Success/failure counts
 * - Optional metrics export (Prometheus, StatsD, etc.)
 *
 * @example
 * const monitor = new Monitor(config);
 * monitor.recordCommand('dev up', 5000, true);
 */

export class Monitor {
  constructor(config) {
    this.config = config || {};
    this.enabled = config.monitoring?.enabled || false;
    this.metrics = {
      commands: new Map(),
      errors: [],
      startTime: Date.now(),
    };

    // Start periodic metrics push if enabled
    if (this.enabled && this.config.monitoring?.pushInterval) {
      this.startMetricsPush();
    }
  }

  /**
   * Record command execution metrics.
   *
   * @param {string} command - Command name
   * @param {number} duration - Execution duration in ms
   * @param {boolean} success - Whether command succeeded
   * @param {Object} metadata - Additional metadata
   */
  recordCommand(command, duration, success, metadata = {}) {
    if (!this.enabled) return;

    const key = command;
    if (!this.metrics.commands.has(key)) {
      this.metrics.commands.set(key, {
        count: 0,
        successes: 0,
        failures: 0,
        totalDuration: 0,
        minDuration: Infinity,
        maxDuration: 0,
        lastExecuted: null,
      });
    }

    const stats = this.metrics.commands.get(key);
    stats.count++;
    stats.totalDuration += duration;
    stats.minDuration = Math.min(stats.minDuration, duration);
    stats.maxDuration = Math.max(stats.maxDuration, duration);
    stats.lastExecuted = new Date().toISOString();

    if (success) {
      stats.successes++;
    } else {
      stats.failures++;
    }

    // Log to console in debug mode
    if (this.config.output?.logLevel === 'debug') {
      console.debug(`[Metrics] ${command}: ${duration}ms (${success ? 'success' : 'failure'})`);
    }
  }

  /**
   * Record an error occurrence.
   *
   * @param {Error} error - Error object
   * @param {string} context - Context where error occurred
   */
  recordError(error, context = 'unknown') {
    if (!this.enabled) return;

    this.metrics.errors.push({
      timestamp: new Date().toISOString(),
      message: error.message,
      name: error.name,
      context,
      stack: error.stack,
    });

    // Keep only last 100 errors to prevent memory issues
    if (this.metrics.errors.length > 100) {
      this.metrics.errors.shift();
    }
  }

  /**
   * Get current metrics summary.
   *
   * @returns {Object} Metrics summary
   */
  getMetrics() {
    const summary = {
      uptime: Date.now() - this.metrics.startTime,
      commands: {},
      errors: {
        count: this.metrics.errors.length,
        recent: this.metrics.errors.slice(-10),
      },
    };

    // Calculate aggregate statistics
    for (const [command, stats] of this.metrics.commands.entries()) {
      summary.commands[command] = {
        ...stats,
        avgDuration: stats.count > 0 ? stats.totalDuration / stats.count : 0,
        successRate: stats.count > 0 ? (stats.successes / stats.count) * 100 : 0,
      };
    }

    return summary;
  }

  /**
   * Export metrics in Prometheus format.
   *
   * @returns {string} Metrics in Prometheus exposition format
   */
  exportPrometheus() {
    const lines = [];

    lines.push('# HELP summit_cli_command_duration_seconds Command execution duration');
    lines.push('# TYPE summit_cli_command_duration_seconds histogram');

    for (const [command, stats] of this.metrics.commands.entries()) {
      const avg = stats.count > 0 ? stats.totalDuration / stats.count / 1000 : 0;
      lines.push(`summit_cli_command_duration_seconds{command="${command}"} ${avg.toFixed(3)}`);
    }

    lines.push('# HELP summit_cli_command_total Total number of command executions');
    lines.push('# TYPE summit_cli_command_total counter');

    for (const [command, stats] of this.metrics.commands.entries()) {
      lines.push(`summit_cli_command_total{command="${command}",status="success"} ${stats.successes}`);
      lines.push(`summit_cli_command_total{command="${command}",status="failure"} ${stats.failures}`);
    }

    lines.push('# HELP summit_cli_errors_total Total number of errors');
    lines.push('# TYPE summit_cli_errors_total counter');
    lines.push(`summit_cli_errors_total ${this.metrics.errors.length}`);

    return lines.join('\n');
  }

  /**
   * Reset all metrics.
   */
  reset() {
    this.metrics = {
      commands: new Map(),
      errors: [],
      startTime: Date.now(),
    };
  }

  /**
   * Start periodic metrics push to configured endpoint.
   *
   * @private
   */
  startMetricsPush() {
    const interval = this.config.monitoring?.pushInterval || 60000;
    const endpoint = this.config.monitoring?.endpoint;

    if (!endpoint) return;

    this.pushInterval = setInterval(async () => {
      try {
        const metrics = this.exportPrometheus();
        await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: metrics,
        });
      } catch (error) {
        console.debug('[Metrics] Failed to push metrics:', error.message);
      }
    }, interval);

    // Don't keep process alive
    this.pushInterval.unref();
  }

  /**
   * Stop metrics push interval.
   */
  stopMetricsPush() {
    if (this.pushInterval) {
      clearInterval(this.pushInterval);
      this.pushInterval = null;
    }
  }

  /**
   * Create a monitoring context for tracking an operation.
   *
   * @param {string} operation - Operation name
   * @returns {Object} Context with start/end methods
   */
  createContext(operation) {
    const startTime = Date.now();

    return {
      operation,
      startTime,

      /**
       * Complete the operation and record metrics.
       *
       * @param {boolean} success - Whether operation succeeded
       * @param {Object} metadata - Additional metadata
       */
      end: (success = true, metadata = {}) => {
        const duration = Date.now() - startTime;
        this.recordCommand(operation, duration, success, metadata);
      },

      /**
       * Record an error in this context.
       *
       * @param {Error} error - Error object
       */
      error: (error) => {
        this.recordError(error, operation);
      },
    };
  }
}

/**
 * Global monitor instance (singleton).
 * Initialized by the main CLI program.
 */
let globalMonitor = null;

/**
 * Initialize the global monitor.
 *
 * @param {Object} config - Configuration object
 * @returns {Monitor} Monitor instance
 */
export function initializeMonitor(config) {
  globalMonitor = new Monitor(config);
  return globalMonitor;
}

/**
 * Get the global monitor instance.
 *
 * @returns {Monitor|null} Monitor instance or null if not initialized
 */
export function getMonitor() {
  return globalMonitor;
}

/**
 * Decorator for monitoring command execution.
 *
 * @param {string} commandName - Command name for monitoring
 * @returns {Function} Decorator function
 */
export function monitored(commandName) {
  return function(target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function(...args) {
      const monitor = getMonitor();
      if (!monitor || !monitor.enabled) {
        return originalMethod.apply(this, args);
      }

      const context = monitor.createContext(commandName);
      try {
        const result = await originalMethod.apply(this, args);
        context.end(true);
        return result;
      } catch (error) {
        context.error(error);
        context.end(false);
        throw error;
      }
    };

    return descriptor;
  };
}
