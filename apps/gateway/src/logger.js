"use strict";
/**
 * Structured Logger with OpenTelemetry Correlation
 * Provides JSON logging with trace/span context for Loki ingestion
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogContext = exports.logger = void 0;
const api_1 = require("@opentelemetry/api");
const crypto_1 = require("crypto");
class StructuredLogger {
    serviceName;
    constructor(serviceName) {
        this.serviceName = serviceName;
    }
    log(level, message, context = {}) {
        const span = api_1.trace.getActiveSpan();
        const spanContext = span?.spanContext();
        // Hash sensitive IDs for privacy
        const sanitizedContext = this.sanitizeContext(context);
        const logEntry = {
            timestamp: new Date().toISOString(),
            level,
            service: this.serviceName,
            traceId: spanContext?.traceId || 'no-trace',
            spanId: spanContext?.spanId || 'no-span',
            ...sanitizedContext,
            message,
        };
        // Output as JSON for Loki/structured ingestion
        const jsonLog = JSON.stringify(logEntry);
        // Route to appropriate console method
        switch (level) {
            case 'debug':
                console.debug(jsonLog);
                break;
            case 'info':
                console.info(jsonLog);
                break;
            case 'warn':
                console.warn(jsonLog);
                break;
            case 'error':
                console.error(jsonLog);
                break;
        }
        // Add log event to active span
        if (span) {
            span.addEvent(`log.${level}`, {
                'log.message': message,
                'log.level': level,
            });
        }
    }
    sanitizeContext(context) {
        const sanitized = { ...context };
        // Hash user IDs to prevent PII leakage
        if (sanitized.userId) {
            sanitized.userId = this.hashId(sanitized.userId);
        }
        // Investigation IDs are okay to log (business identifiers)
        // Entity/Relationship IDs are okay (UUIDs)
        // Remove any sensitive fields
        delete sanitized.password;
        delete sanitized.secret;
        delete sanitized.token;
        delete sanitized.apiKey;
        return sanitized;
    }
    hashId(id) {
        return 'hash_' + (0, crypto_1.createHash)('sha256').update(id).digest('hex').slice(0, 8);
    }
    debug(message, context) {
        this.log('debug', message, context);
    }
    info(message, context) {
        this.log('info', message, context);
    }
    warn(message, context) {
        this.log('warn', message, context);
    }
    error(message, error, context) {
        const errorContext = error
            ? {
                error: {
                    name: error.name,
                    message: error.message,
                    stack: error.stack,
                },
                ...context,
            }
            : context;
        this.log('error', message, errorContext);
        // Record exception on active span
        const span = api_1.trace.getActiveSpan();
        if (span && error) {
            span.recordException(error);
        }
    }
    // Measure and log operation duration
    async measure(operationName, fn, context) {
        const start = Date.now();
        this.info(`${operationName} started`, context);
        try {
            const result = await fn();
            const durationMs = Date.now() - start;
            this.info(`${operationName} succeeded`, {
                ...context,
                duration_ms: durationMs,
                status: 'success',
            });
            return result;
        }
        catch (error) {
            const durationMs = Date.now() - start;
            this.error(`${operationName} failed`, error, {
                ...context,
                duration_ms: durationMs,
                status: 'error',
            });
            throw error;
        }
    }
}
// Export singleton logger
exports.logger = new StructuredLogger('graphql-gateway');
// Context manager for request-scoped logging
class LogContext {
    requestId;
    baseContext;
    static contextMap = new Map();
    constructor(requestId, baseContext = {}) {
        this.requestId = requestId;
        this.baseContext = baseContext;
        LogContext.contextMap.set(requestId, this);
    }
    static get(requestId) {
        return LogContext.contextMap.get(requestId);
    }
    static cleanup(requestId) {
        LogContext.contextMap.delete(requestId);
    }
    getContext() {
        return { ...this.baseContext };
    }
    setContext(key, value) {
        this.baseContext[key] = value;
    }
}
exports.LogContext = LogContext;
