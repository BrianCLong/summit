"use strict";
/**
 * CompanyOS Observability SDK - Logging Module
 *
 * Provides structured logging with automatic trace correlation,
 * PII redaction, and consistent log schema across all services.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLogger = void 0;
exports.createLogger = createLogger;
exports.withTraceContext = withTraceContext;
exports.createRequestLogger = createRequestLogger;
exports.createOperationLogger = createOperationLogger;
exports.createAuditLogger = createAuditLogger;
exports.mapLogLevel = mapLogLevel;
exports.isLevelEnabled = isLevelEnabled;
exports.logError = logError;
exports.logWarning = logWarning;
const pino_1 = __importDefault(require("pino"));
const api_1 = require("@opentelemetry/api");
/** Default redacted fields */
const DEFAULT_REDACTED_FIELDS = [
    'password',
    'token',
    'secret',
    'apiKey',
    'api_key',
    'authorization',
    'cookie',
    'sessionId',
    'session_id',
    'creditCard',
    'credit_card',
    'ssn',
    'privateKey',
    'private_key',
    'accessToken',
    'access_token',
    'refreshToken',
    'refresh_token',
];
// =============================================================================
// LOGGER FACTORY
// =============================================================================
/**
 * Create a configured logger instance for a service
 */
function createLogger(config) {
    const { service, level = process.env.LOG_LEVEL || 'info', prettyPrint = process.env.NODE_ENV !== 'production', redactFields = [], traceCorrelation = true, serializers = {}, } = config;
    const allRedactedFields = [...DEFAULT_REDACTED_FIELDS, ...redactFields];
    const baseConfig = {
        name: service.name,
        level,
        base: {
            service: service.name,
            environment: service.environment,
            version: service.version,
            team: service.team,
            tier: service.tier,
            pid: process.pid,
            hostname: process.env.HOSTNAME || process.env.HOST,
        },
        timestamp: pino_1.default.stdTimeFunctions.isoTime,
        formatters: {
            level: (label) => ({ level: label.toUpperCase() }),
            bindings: (bindings) => {
                const traceContext = traceCorrelation ? getTraceContext() : {};
                return { ...bindings, ...traceContext };
            },
        },
        redact: {
            paths: allRedactedFields.flatMap((field) => [
                field,
                `*.${field}`,
                `*.*.${field}`,
                `body.${field}`,
                `headers.${field}`,
                `query.${field}`,
            ]),
            remove: true,
        },
        serializers: {
            err: pino_1.default.stdSerializers.err,
            error: pino_1.default.stdSerializers.err,
            req: serializeRequest,
            res: serializeResponse,
            ...serializers,
        },
    };
    // Pretty printing for development
    const transport = prettyPrint
        ? {
            target: 'pino-pretty',
            options: {
                colorize: true,
                translateTime: 'SYS:HH:MM:ss.l',
                ignore: 'pid,hostname',
                messageFormat: '[{service}] {msg}',
                errorLikeObjectKeys: ['err', 'error'],
            },
        }
        : undefined;
    return (0, pino_1.default)({ ...baseConfig, transport });
}
// =============================================================================
// TRACE CORRELATION
// =============================================================================
/**
 * Extract OpenTelemetry trace context from the active span
 */
function getTraceContext() {
    const activeSpan = api_1.trace.getActiveSpan();
    if (!activeSpan) {
        return {};
    }
    const spanContext = activeSpan.spanContext();
    return {
        traceId: spanContext.traceId,
        spanId: spanContext.spanId,
        traceFlags: spanContext.traceFlags,
    };
}
/**
 * Create a child logger with trace context
 */
function withTraceContext(logger) {
    const traceContext = getTraceContext();
    if (!traceContext.traceId) {
        return logger;
    }
    return logger.child(traceContext);
}
function serializeRequest(req) {
    return {
        id: req.id || req.headers?.['x-request-id'],
        method: req.method,
        url: req.url,
        path: req.path,
        query: req.query,
        headers: {
            'user-agent': req.headers?.['user-agent'],
            'content-type': req.headers?.['content-type'],
            'content-length': req.headers?.['content-length'],
            'x-request-id': req.headers?.['x-request-id'],
            'x-forwarded-for': req.headers?.['x-forwarded-for'],
        },
        remoteAddress: req.socket?.remoteAddress || req.ip,
        remotePort: req.socket?.remotePort,
    };
}
function serializeResponse(res) {
    return {
        statusCode: res.statusCode,
        headers: {
            'content-type': res.getHeader?.('content-type'),
            'content-length': res.getHeader?.('content-length'),
        },
    };
}
// =============================================================================
// CHILD LOGGER FACTORY
// =============================================================================
/**
 * Create a child logger with request context
 */
function createRequestLogger(logger, context) {
    return logger.child({
        ...context,
        ...getTraceContext(),
    });
}
/**
 * Create a child logger for a specific operation
 */
function createOperationLogger(logger, operation, metadata) {
    return logger.child({
        operation,
        ...metadata,
        ...getTraceContext(),
    });
}
// =============================================================================
// AUDIT LOGGING
// =============================================================================
/**
 * Create an audit logger for security-relevant events
 */
function createAuditLogger(baseLogger) {
    const auditLogger = baseLogger.child({ audit: true });
    return new AuditLogger(auditLogger);
}
class AuditLogger {
    logger;
    constructor(logger) {
        this.logger = logger;
    }
    /**
     * Log an authentication event
     */
    logAuth(action, actor, outcome, metadata) {
        this.log({
            type: 'auth',
            action,
            actor,
            resource: { type: 'session', id: 'current' },
            outcome,
            metadata,
        });
    }
    /**
     * Log a resource access event
     */
    logAccess(action, actor, resource, outcome, metadata) {
        this.log({
            type: 'access',
            action,
            actor,
            resource,
            outcome,
            metadata,
        });
    }
    /**
     * Log a mutation event
     */
    logMutation(action, actor, resource, outcome, metadata) {
        this.log({
            type: 'mutation',
            action,
            actor,
            resource,
            outcome,
            metadata,
        });
    }
    /**
     * Log an admin action
     */
    logAdmin(action, actor, resource, outcome, metadata) {
        this.log({
            type: 'admin',
            action,
            actor,
            resource,
            outcome,
            metadata,
        });
    }
    /**
     * Log a security event
     */
    logSecurity(action, actor, resource, outcome, metadata) {
        this.log({
            type: 'security',
            action,
            actor,
            resource,
            outcome,
            metadata,
        });
    }
    log(event) {
        const traceContext = getTraceContext();
        const fullEvent = {
            ...event,
            timestamp: new Date().toISOString(),
            context: {
                traceId: traceContext.traceId,
                requestId: undefined, // Set by middleware
                tenantId: undefined, // Set by middleware
            },
        };
        // Use warn level for audit events to ensure they're always captured
        this.logger.warn({ auditEvent: fullEvent }, `AUDIT: ${event.type}.${event.action}`);
    }
}
exports.AuditLogger = AuditLogger;
// =============================================================================
// LOG LEVEL UTILITIES
// =============================================================================
/**
 * Map log level to pino level
 */
function mapLogLevel(level) {
    return level;
}
/**
 * Check if a log level is enabled
 */
function isLevelEnabled(logger, level) {
    return logger.isLevelEnabled(level);
}
/**
 * Log an error with full context
 */
function logError(logger, context) {
    const { error, operation, userId, requestId, metadata } = context;
    logger.error({
        err: error,
        operation,
        userId,
        requestId,
        errorType: error.name,
        errorCode: error.code,
        ...metadata,
        ...getTraceContext(),
    }, error.message);
}
/**
 * Log a warning with context
 */
function logWarning(logger, message, context) {
    logger.warn({ ...context, ...getTraceContext() }, message);
}
