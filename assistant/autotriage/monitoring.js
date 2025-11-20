/**
 * Monitoring and Observability Module
 *
 * Provides hooks for monitoring autotriage operations:
 * - Performance metrics
 * - Error tracking
 * - Usage statistics
 * - Audit logging
 *
 * @module monitoring
 */
/**
 * Central monitoring class for autotriage operations
 */
export class TriageMonitor {
    static instance;
    metrics = [];
    errors = [];
    auditLogs = [];
    verbose = false;
    constructor() { }
    /**
     * Get singleton instance
     */
    static getInstance() {
        if (!TriageMonitor.instance) {
            TriageMonitor.instance = new TriageMonitor();
        }
        return TriageMonitor.instance;
    }
    /**
     * Enable verbose logging
     */
    setVerbose(verbose) {
        this.verbose = verbose;
    }
    /**
     * Start tracking an operation
     *
     * @param operation - Operation name
     * @param metadata - Optional metadata
     * @returns Operation ID for tracking
     */
    startOperation(operation, metadata) {
        const operationId = `${operation}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        const metric = {
            operationId,
            operation,
            startTime: Date.now(),
            itemsProcessed: 0,
            errorsEncountered: 0,
            warnings: 0,
            metadata,
        };
        this.metrics.push(metric);
        if (this.verbose) {
            console.log(`[MONITOR] Started: ${operation} (${operationId})`);
        }
        return operationId;
    }
    /**
     * End tracking an operation
     *
     * @param operationId - Operation ID from startOperation
     * @param stats - Final statistics
     */
    endOperation(operationId, stats) {
        const metric = this.metrics.find((m) => m.operationId === operationId);
        if (!metric) {
            console.warn(`[MONITOR] Unknown operation ID: ${operationId}`);
            return;
        }
        metric.endTime = Date.now();
        metric.duration = metric.endTime - metric.startTime;
        if (stats) {
            Object.assign(metric, stats);
        }
        if (this.verbose) {
            console.log(`[MONITOR] Completed: ${metric.operation} in ${metric.duration}ms (${metric.itemsProcessed} items, ${metric.errorsEncountered} errors)`);
        }
        // Emit metrics if handler is configured
        this.emitMetrics(metric);
    }
    /**
     * Record an error event
     *
     * @param operation - Operation where error occurred
     * @param error - Error message or object
     * @param context - Additional context
     * @param severity - Error severity
     * @param recoverable - Whether error was recovered from
     */
    recordError(operation, error, context, severity = 'medium', recoverable = true) {
        const errorEvent = {
            timestamp: Date.now(),
            operation,
            error: error instanceof Error ? error.message : error,
            context,
            severity,
            recoverable,
        };
        this.errors.push(errorEvent);
        if (this.verbose) {
            console.warn(`[MONITOR] Error [${severity}]: ${operation} - ${errorEvent.error}${context ? ` (${context})` : ''}`);
        }
        // Emit error if handler is configured
        this.emitError(errorEvent);
    }
    /**
     * Record an audit log entry
     *
     * @param operation - Operation performed
     * @param itemsAffected - Number of items affected
     * @param details - Operation details
     * @param user - User who performed operation
     */
    recordAudit(operation, itemsAffected, details, user) {
        const auditLog = {
            timestamp: Date.now(),
            operation,
            user: user || process.env.USER || 'unknown',
            itemsAffected,
            details,
        };
        this.auditLogs.push(auditLog);
        if (this.verbose) {
            console.log(`[MONITOR] Audit: ${operation} by ${auditLog.user} (${itemsAffected} items)`);
        }
        // Emit audit log if handler is configured
        this.emitAuditLog(auditLog);
    }
    /**
     * Get all recorded metrics
     */
    getMetrics() {
        return [...this.metrics];
    }
    /**
     * Get all recorded errors
     */
    getErrors() {
        return [...this.errors];
    }
    /**
     * Get all audit logs
     */
    getAuditLogs() {
        return [...this.auditLogs];
    }
    /**
     * Get summary statistics
     */
    getSummary() {
        const completed = this.metrics.filter((m) => m.endTime !== undefined);
        const totalDuration = completed.reduce((sum, m) => sum + (m.duration || 0), 0);
        const totalItemsProcessed = completed.reduce((sum, m) => sum + m.itemsProcessed, 0);
        const totalErrors = completed.reduce((sum, m) => sum + m.errorsEncountered, 0);
        return {
            totalOperations: completed.length,
            totalDuration,
            totalItemsProcessed,
            totalErrors,
            averageDuration: completed.length > 0 ? totalDuration / completed.length : 0,
            errorRate: totalItemsProcessed > 0 ? totalErrors / totalItemsProcessed : 0,
        };
    }
    /**
     * Clear all monitoring data
     */
    clear() {
        this.metrics = [];
        this.errors = [];
        this.auditLogs = [];
    }
    /**
     * Export monitoring data for external systems
     *
     * @param format - Export format
     * @returns Formatted monitoring data
     */
    export(format = 'json') {
        if (format === 'prometheus') {
            return this.exportPrometheus();
        }
        return JSON.stringify({
            summary: this.getSummary(),
            metrics: this.metrics,
            errors: this.errors,
            auditLogs: this.auditLogs,
            exportedAt: new Date().toISOString(),
        }, null, 2);
    }
    /**
     * Export in Prometheus format
     */
    exportPrometheus() {
        const summary = this.getSummary();
        const lines = [];
        lines.push('# HELP autotriage_operations_total Total number of triage operations');
        lines.push('# TYPE autotriage_operations_total counter');
        lines.push(`autotriage_operations_total ${summary.totalOperations}`);
        lines.push('');
        lines.push('# HELP autotriage_items_processed_total Total number of items processed');
        lines.push('# TYPE autotriage_items_processed_total counter');
        lines.push(`autotriage_items_processed_total ${summary.totalItemsProcessed}`);
        lines.push('');
        lines.push('# HELP autotriage_errors_total Total number of errors encountered');
        lines.push('# TYPE autotriage_errors_total counter');
        lines.push(`autotriage_errors_total ${summary.totalErrors}`);
        lines.push('');
        lines.push('# HELP autotriage_operation_duration_ms Operation duration in milliseconds');
        lines.push('# TYPE autotriage_operation_duration_ms gauge');
        lines.push(`autotriage_operation_duration_ms ${summary.averageDuration}`);
        lines.push('');
        lines.push('# HELP autotriage_error_rate Error rate per item processed');
        lines.push('# TYPE autotriage_error_rate gauge');
        lines.push(`autotriage_error_rate ${summary.errorRate}`);
        lines.push('');
        return lines.join('\n');
    }
    /**
     * Emit metrics to configured handler (override in production)
     */
    emitMetrics(metrics) {
        // Override this method to send to your metrics service
        // Example: send to DataDog, Prometheus, CloudWatch, etc.
    }
    /**
     * Emit error to configured handler (override in production)
     */
    emitError(error) {
        // Override this method to send to your error tracking service
        // Example: send to Sentry, Rollbar, etc.
    }
    /**
     * Emit audit log to configured handler (override in production)
     */
    emitAuditLog(auditLog) {
        // Override this method to send to your audit logging service
        // Example: send to Splunk, Elasticsearch, etc.
    }
}
/**
 * Convenience function to get monitor instance
 */
export function getMonitor() {
    return TriageMonitor.getInstance();
}
/**
 * Decorator to automatically track operation timing
 *
 * @param operationName - Name of the operation
 */
export function monitored(operationName) {
    return function (target, propertyKey, descriptor) {
        const originalMethod = descriptor.value;
        const monitor = getMonitor();
        const opName = operationName || `${target.constructor.name}.${propertyKey}`;
        descriptor.value = async function (...args) {
            const operationId = monitor.startOperation(opName);
            try {
                const result = await originalMethod.apply(this, args);
                monitor.endOperation(operationId, {
                    itemsProcessed: Array.isArray(result) ? result.length : 1,
                });
                return result;
            }
            catch (error) {
                monitor.recordError(opName, error, undefined, 'high', false);
                monitor.endOperation(operationId, { errorsEncountered: 1 });
                throw error;
            }
        };
        return descriptor;
    };
}
//# sourceMappingURL=monitoring.js.map