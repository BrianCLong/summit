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
export interface TriageMetrics {
    operationId: string;
    operation: string;
    startTime: number;
    endTime?: number;
    duration?: number;
    itemsProcessed: number;
    errorsEncountered: number;
    warnings: number;
    source?: string;
    metadata?: Record<string, any>;
}
export interface ErrorEvent {
    timestamp: number;
    operation: string;
    error: string;
    context?: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    recoverable: boolean;
}
export interface AuditLog {
    timestamp: number;
    operation: string;
    user?: string;
    itemsAffected: number;
    details: Record<string, any>;
}
/**
 * Central monitoring class for autotriage operations
 */
export declare class TriageMonitor {
    private static instance;
    private metrics;
    private errors;
    private auditLogs;
    private verbose;
    private constructor();
    /**
     * Get singleton instance
     */
    static getInstance(): TriageMonitor;
    /**
     * Enable verbose logging
     */
    setVerbose(verbose: boolean): void;
    /**
     * Start tracking an operation
     *
     * @param operation - Operation name
     * @param metadata - Optional metadata
     * @returns Operation ID for tracking
     */
    startOperation(operation: string, metadata?: Record<string, any>): string;
    /**
     * End tracking an operation
     *
     * @param operationId - Operation ID from startOperation
     * @param stats - Final statistics
     */
    endOperation(operationId: string, stats?: Partial<TriageMetrics>): void;
    /**
     * Record an error event
     *
     * @param operation - Operation where error occurred
     * @param error - Error message or object
     * @param context - Additional context
     * @param severity - Error severity
     * @param recoverable - Whether error was recovered from
     */
    recordError(operation: string, error: string | Error, context?: string, severity?: 'low' | 'medium' | 'high' | 'critical', recoverable?: boolean): void;
    /**
     * Record an audit log entry
     *
     * @param operation - Operation performed
     * @param itemsAffected - Number of items affected
     * @param details - Operation details
     * @param user - User who performed operation
     */
    recordAudit(operation: string, itemsAffected: number, details: Record<string, any>, user?: string): void;
    /**
     * Get all recorded metrics
     */
    getMetrics(): TriageMetrics[];
    /**
     * Get all recorded errors
     */
    getErrors(): ErrorEvent[];
    /**
     * Get all audit logs
     */
    getAuditLogs(): AuditLog[];
    /**
     * Get summary statistics
     */
    getSummary(): {
        totalOperations: number;
        totalDuration: number;
        totalItemsProcessed: number;
        totalErrors: number;
        averageDuration: number;
        errorRate: number;
    };
    /**
     * Clear all monitoring data
     */
    clear(): void;
    /**
     * Export monitoring data for external systems
     *
     * @param format - Export format
     * @returns Formatted monitoring data
     */
    export(format?: 'json' | 'prometheus'): string;
    /**
     * Export in Prometheus format
     */
    private exportPrometheus;
    /**
     * Emit metrics to configured handler (override in production)
     */
    protected emitMetrics(metrics: TriageMetrics): void;
    /**
     * Emit error to configured handler (override in production)
     */
    protected emitError(error: ErrorEvent): void;
    /**
     * Emit audit log to configured handler (override in production)
     */
    protected emitAuditLog(auditLog: AuditLog): void;
}
/**
 * Convenience function to get monitor instance
 */
export declare function getMonitor(): TriageMonitor;
/**
 * Decorator to automatically track operation timing
 *
 * @param operationName - Name of the operation
 */
export declare function monitored(operationName?: string): (target: any, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor;
//# sourceMappingURL=monitoring.d.ts.map