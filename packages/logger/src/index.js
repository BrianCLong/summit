"use strict";
/**
 * @intelgraph/logger
 *
 * Shared structured logging package for Summit platform
 *
 * Features:
 * - Structured JSON logging with Pino
 * - Automatic OpenTelemetry trace correlation
 * - Consistent log schema across all services
 * - Environment-aware formatting (pretty in dev, JSON in prod)
 * - Log redaction for sensitive fields
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogLevel = void 0;
exports.createLogger = createLogger;
exports.createChildLogger = createChildLogger;
exports.createLogMiddleware = createLogMiddleware;
exports.logWithSpan = logWithSpan;
const pino_1 = __importDefault(require("pino"));
const api_1 = require("@opentelemetry/api");
/**
 * Create a logger instance with OpenTelemetry correlation
 */
function createLogger(config) {
    const { serviceName, level = process.env.LOG_LEVEL || 'info', prettyPrint = process.env.NODE_ENV !== 'production', redact = ['password', 'token', 'secret', 'apiKey', 'authorization'] } = config;
    const baseConfig = {
        name: serviceName,
        level,
        // Standard fields for all logs
        base: {
            service: serviceName,
            environment: process.env.NODE_ENV || 'development',
            version: process.env.SERVICE_VERSION || '1.0.0',
            hostname: process.env.HOSTNAME,
        },
        // Timestamp in ISO format
        timestamp: pino_1.default.stdTimeFunctions.isoTime,
        // Format level as uppercase string
        formatters: {
            level: (label) => {
                return { level: label.toUpperCase() };
            },
            // Add OpenTelemetry context to every log
            bindings: (bindings) => {
                return {
                    ...bindings,
                    ...getTraceContext(),
                };
            },
        },
        // Redact sensitive fields
        redact: {
            paths: redact,
            remove: true,
        },
        // Serialize errors with stack traces
        serializers: {
            err: pino_1.default.stdSerializers.err,
            error: pino_1.default.stdSerializers.err,
            req: pino_1.default.stdSerializers.req,
            res: pino_1.default.stdSerializers.res,
        },
    };
    // Use pretty printing in development
    const transport = prettyPrint
        ? {
            target: 'pino-pretty',
            options: {
                colorize: true,
                translateTime: 'HH:MM:ss Z',
                ignore: 'pid,hostname',
                messageFormat: '{service} [{level}] {msg}',
                errorLikeObjectKeys: ['err', 'error'],
            },
        }
        : undefined;
    return (0, pino_1.default)({
        ...baseConfig,
        transport,
    });
}
/**
 * Extract OpenTelemetry trace context from active span
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
    };
}
/**
 * Create a child logger with additional context
 */
function createChildLogger(logger, context) {
    return logger.child(context);
}
/**
 * Log middleware for Express/Fastify
 * Automatically adds request context to logs
 */
function createLogMiddleware(logger) {
    return (req, res, next) => {
        const requestId = req.headers['x-request-id'] || generateRequestId();
        const userId = req.user?.id;
        const tenantId = req.tenant?.id;
        // Attach child logger with request context
        req.log = logger.child({
            requestId,
            userId,
            tenantId,
            method: req.method,
            url: req.url,
            userAgent: req.headers['user-agent'],
        });
        // Log request start
        req.log.info('Request started');
        // Log request completion
        const startTime = Date.now();
        res.on('finish', () => {
            const duration = Date.now() - startTime;
            req.log.info({
                statusCode: res.statusCode,
                duration,
            }, 'Request completed');
        });
        next();
    };
}
/**
 * Generate a unique request ID
 */
function generateRequestId() {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
/**
 * Log levels enum for type safety
 */
var LogLevel;
(function (LogLevel) {
    LogLevel["TRACE"] = "trace";
    LogLevel["DEBUG"] = "debug";
    LogLevel["INFO"] = "info";
    LogLevel["WARN"] = "warn";
    LogLevel["ERROR"] = "error";
    LogLevel["FATAL"] = "fatal";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
/**
 * Utility function to log with OpenTelemetry span attributes
 */
function logWithSpan(logger, level, message, attributes) {
    const activeSpan = api_1.trace.getActiveSpan();
    if (activeSpan && attributes) {
        activeSpan.setAttributes(attributes);
    }
    logger[level]({ ...attributes, ...getTraceContext() }, message);
}
/**
 * Default export: createLogger
 */
exports.default = createLogger;
