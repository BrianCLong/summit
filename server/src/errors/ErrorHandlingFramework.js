"use strict";
/**
 * @fileoverview Production-Grade Error Handling Framework
 *
 * Comprehensive error handling system implementing:
 * - Structured error classes with error codes
 * - Error categorization (operational vs programming)
 * - Automatic error recovery strategies
 * - Error correlation and tracing
 * - Graceful degradation patterns
 * - Circuit breaker integration
 * - Error reporting and metrics
 *
 * @module errors/ErrorHandlingFramework
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = exports.ErrorHandlerManager = exports.BusinessError = exports.RateLimitError = exports.ServiceError = exports.DatabaseError = exports.ConflictError = exports.NotFoundError = exports.ValidationError = exports.AuthorizationError = exports.AuthenticationError = exports.AppError = exports.ErrorCategory = exports.ErrorSeverity = exports.ErrorCodes = void 0;
exports.withRetry = withRetry;
exports.withFallback = withFallback;
exports.withTimeout = withTimeout;
const crypto = __importStar(require("crypto"));
// ============================================================================
// Error Codes and Categories
// ============================================================================
/**
 * Standardized error codes for the IntelGraph platform
 */
exports.ErrorCodes = {
    // Authentication & Authorization (1xxx)
    AUTH_INVALID_TOKEN: 'E1001',
    AUTH_TOKEN_EXPIRED: 'E1002',
    AUTH_INSUFFICIENT_PERMISSIONS: 'E1003',
    AUTH_INVALID_CREDENTIALS: 'E1004',
    AUTH_SESSION_EXPIRED: 'E1005',
    AUTH_MFA_REQUIRED: 'E1006',
    AUTH_ACCOUNT_LOCKED: 'E1007',
    AUTH_RATE_LIMITED: 'E1008',
    // Validation (2xxx)
    VALIDATION_FAILED: 'E2001',
    VALIDATION_INVALID_INPUT: 'E2002',
    VALIDATION_MISSING_FIELD: 'E2003',
    VALIDATION_INVALID_FORMAT: 'E2004',
    VALIDATION_CONSTRAINT_VIOLATION: 'E2005',
    VALIDATION_SCHEMA_MISMATCH: 'E2006',
    // Resource (3xxx)
    RESOURCE_NOT_FOUND: 'E3001',
    RESOURCE_ALREADY_EXISTS: 'E3002',
    RESOURCE_CONFLICT: 'E3003',
    RESOURCE_LOCKED: 'E3004',
    RESOURCE_DELETED: 'E3005',
    // Database (4xxx)
    DB_CONNECTION_FAILED: 'E4001',
    DB_QUERY_FAILED: 'E4002',
    DB_TRANSACTION_FAILED: 'E4003',
    DB_CONSTRAINT_VIOLATION: 'E4004',
    DB_TIMEOUT: 'E4005',
    DB_DEADLOCK: 'E4006',
    // External Service (5xxx)
    SERVICE_UNAVAILABLE: 'E5001',
    SERVICE_TIMEOUT: 'E5002',
    SERVICE_RATE_LIMITED: 'E5003',
    SERVICE_CIRCUIT_OPEN: 'E5004',
    SERVICE_INVALID_RESPONSE: 'E5005',
    // Business Logic (6xxx)
    BUSINESS_RULE_VIOLATION: 'E6001',
    BUSINESS_QUOTA_EXCEEDED: 'E6002',
    BUSINESS_INVALID_STATE: 'E6003',
    BUSINESS_OPERATION_FAILED: 'E6004',
    // Internal (9xxx)
    INTERNAL_ERROR: 'E9001',
    INTERNAL_CONFIG_ERROR: 'E9002',
    INTERNAL_DEPENDENCY_ERROR: 'E9003',
    INTERNAL_UNEXPECTED: 'E9999',
};
/**
 * Error severity levels
 */
var ErrorSeverity;
(function (ErrorSeverity) {
    ErrorSeverity["DEBUG"] = "debug";
    ErrorSeverity["INFO"] = "info";
    ErrorSeverity["WARN"] = "warn";
    ErrorSeverity["ERROR"] = "error";
    ErrorSeverity["CRITICAL"] = "critical";
})(ErrorSeverity || (exports.ErrorSeverity = ErrorSeverity = {}));
/**
 * Error categories for handling strategy
 */
var ErrorCategory;
(function (ErrorCategory) {
    /** Operational errors - expected, recoverable */
    ErrorCategory["OPERATIONAL"] = "operational";
    /** Programming errors - bugs, should crash in development */
    ErrorCategory["PROGRAMMING"] = "programming";
    /** Transient errors - temporary, should retry */
    ErrorCategory["TRANSIENT"] = "transient";
    /** Security errors - potential attacks */
    ErrorCategory["SECURITY"] = "security";
})(ErrorCategory || (exports.ErrorCategory = ErrorCategory = {}));
/**
 * Base application error class
 */
class AppError extends Error {
    code;
    statusCode;
    severity;
    category;
    isOperational;
    context;
    timestamp;
    retryable;
    constructor(message, code = exports.ErrorCodes.INTERNAL_ERROR, options = {}) {
        super(message);
        this.name = this.constructor.name;
        this.code = code;
        this.statusCode = options.statusCode ?? 500;
        this.severity = options.severity ?? ErrorSeverity.ERROR;
        this.category = options.category ?? ErrorCategory.OPERATIONAL;
        this.isOperational = this.category !== ErrorCategory.PROGRAMMING;
        this.retryable = options.retryable ?? false;
        this.timestamp = new Date();
        this.context = {
            correlationId: options.context?.correlationId ?? crypto.randomUUID(),
            ...options.context,
        };
        if (options.cause) {
            this.context.cause = options.cause;
        }
        Error.captureStackTrace(this, this.constructor);
    }
    /**
     * Serialize error for API response
     */
    toJSON() {
        return {
            code: this.code,
            message: this.message,
            correlationId: this.context.correlationId,
            timestamp: this.timestamp.toISOString(),
        };
    }
    /**
     * Serialize error for logging (includes more details)
     */
    toLogFormat() {
        return {
            name: this.name,
            code: this.code,
            message: this.message,
            statusCode: this.statusCode,
            severity: this.severity,
            category: this.category,
            isOperational: this.isOperational,
            retryable: this.retryable,
            correlationId: this.context.correlationId,
            context: this.context,
            stack: this.stack,
            timestamp: this.timestamp.toISOString(),
        };
    }
}
exports.AppError = AppError;
// ============================================================================
// Specific Error Classes
// ============================================================================
/**
 * Authentication/Authorization errors
 */
class AuthenticationError extends AppError {
    constructor(message, code = exports.ErrorCodes.AUTH_INVALID_TOKEN, context) {
        super(message, code, {
            statusCode: 401,
            severity: ErrorSeverity.WARN,
            category: ErrorCategory.SECURITY,
            context,
        });
    }
}
exports.AuthenticationError = AuthenticationError;
class AuthorizationError extends AppError {
    constructor(message, code = exports.ErrorCodes.AUTH_INSUFFICIENT_PERMISSIONS, context) {
        super(message, code, {
            statusCode: 403,
            severity: ErrorSeverity.WARN,
            category: ErrorCategory.SECURITY,
            context,
        });
    }
}
exports.AuthorizationError = AuthorizationError;
/**
 * Validation errors
 */
class ValidationError extends AppError {
    validationErrors;
    constructor(message, validationErrors = [], context) {
        super(message, exports.ErrorCodes.VALIDATION_FAILED, {
            statusCode: 400,
            severity: ErrorSeverity.INFO,
            category: ErrorCategory.OPERATIONAL,
            context,
        });
        this.validationErrors = validationErrors;
    }
    toJSON() {
        return {
            ...super.toJSON(),
            details: { validationErrors: this.validationErrors },
        };
    }
}
exports.ValidationError = ValidationError;
/**
 * Resource errors
 */
class NotFoundError extends AppError {
    constructor(resource, identifier, context) {
        const message = identifier
            ? `${resource} with identifier '${identifier}' not found`
            : `${resource} not found`;
        super(message, exports.ErrorCodes.RESOURCE_NOT_FOUND, {
            statusCode: 404,
            severity: ErrorSeverity.INFO,
            category: ErrorCategory.OPERATIONAL,
            context: { ...context, metadata: { resource, identifier } },
        });
    }
}
exports.NotFoundError = NotFoundError;
class ConflictError extends AppError {
    constructor(message, context) {
        super(message, exports.ErrorCodes.RESOURCE_CONFLICT, {
            statusCode: 409,
            severity: ErrorSeverity.WARN,
            category: ErrorCategory.OPERATIONAL,
            context,
        });
    }
}
exports.ConflictError = ConflictError;
/**
 * Database errors
 */
class DatabaseError extends AppError {
    constructor(message, code = exports.ErrorCodes.DB_QUERY_FAILED, options = {}) {
        super(message, code, {
            statusCode: 500,
            severity: ErrorSeverity.ERROR,
            category: options.retryable ? ErrorCategory.TRANSIENT : ErrorCategory.OPERATIONAL,
            context: options.context,
            cause: options.cause,
            retryable: options.retryable ?? false,
        });
    }
}
exports.DatabaseError = DatabaseError;
/**
 * External service errors
 */
class ServiceError extends AppError {
    serviceName;
    constructor(serviceName, message, code = exports.ErrorCodes.SERVICE_UNAVAILABLE, options = {}) {
        super(message, code, {
            statusCode: 503,
            severity: ErrorSeverity.ERROR,
            category: options.retryable ? ErrorCategory.TRANSIENT : ErrorCategory.OPERATIONAL,
            context: { ...options.context, metadata: { serviceName } },
            cause: options.cause,
            retryable: options.retryable ?? true,
        });
        this.serviceName = serviceName;
    }
}
exports.ServiceError = ServiceError;
/**
 * Rate limiting error
 */
class RateLimitError extends AppError {
    retryAfter;
    constructor(message = 'Rate limit exceeded', retryAfter = 60, context) {
        super(message, exports.ErrorCodes.AUTH_RATE_LIMITED, {
            statusCode: 429,
            severity: ErrorSeverity.WARN,
            category: ErrorCategory.OPERATIONAL,
            context,
        });
        this.retryAfter = retryAfter;
    }
    toJSON() {
        return {
            ...super.toJSON(),
            details: { retryAfter: this.retryAfter },
        };
    }
}
exports.RateLimitError = RateLimitError;
/**
 * Business logic errors
 */
class BusinessError extends AppError {
    constructor(message, code = exports.ErrorCodes.BUSINESS_RULE_VIOLATION, context) {
        super(message, code, {
            statusCode: 422,
            severity: ErrorSeverity.WARN,
            category: ErrorCategory.OPERATIONAL,
            context,
        });
    }
}
exports.BusinessError = BusinessError;
/**
 * Default error transformers
 */
const defaultTransformers = [
    // PostgreSQL errors
    {
        canTransform: (error) => {
            return typeof error === 'object' && error !== null && 'code' in error;
        },
        transform: (error) => {
            const pgError = error;
            switch (pgError.code) {
                case '23505': // unique_violation
                    return new ConflictError(pgError.detail ?? 'Duplicate entry exists', { metadata: { pgCode: pgError.code } });
                case '23503': // foreign_key_violation
                    return new ValidationError('Referenced resource does not exist', [{ field: 'reference', message: pgError.detail ?? 'Invalid reference' }]);
                case '23502': // not_null_violation
                    return new ValidationError('Required field is missing', [{ field: 'unknown', message: pgError.message }]);
                case '57P01': // admin_shutdown
                case '57P02': // crash_shutdown
                case '57P03': // cannot_connect_now
                    return new DatabaseError('Database temporarily unavailable', exports.ErrorCodes.DB_CONNECTION_FAILED, { retryable: true, cause: error });
                case '40001': // serialization_failure
                    return new DatabaseError('Transaction conflict, please retry', exports.ErrorCodes.DB_DEADLOCK, { retryable: true, cause: error });
                default:
                    return new DatabaseError(pgError.message, exports.ErrorCodes.DB_QUERY_FAILED, { cause: error });
            }
        },
    },
    // JWT errors
    {
        canTransform: (error) => {
            return error instanceof Error && (error.name === 'JsonWebTokenError' ||
                error.name === 'TokenExpiredError' ||
                error.name === 'NotBeforeError');
        },
        transform: (error) => {
            const jwtError = error;
            if (jwtError.name === 'TokenExpiredError') {
                return new AuthenticationError('Token has expired', exports.ErrorCodes.AUTH_TOKEN_EXPIRED);
            }
            return new AuthenticationError('Invalid token', exports.ErrorCodes.AUTH_INVALID_TOKEN);
        },
    },
    // Axios/fetch errors
    {
        canTransform: (error) => {
            return typeof error === 'object' && error !== null && ('isAxiosError' in error ||
                error.name === 'FetchError');
        },
        transform: (error) => {
            const networkError = error;
            if (networkError.code === 'ECONNREFUSED' || networkError.code === 'ETIMEDOUT') {
                return new ServiceError('external', 'Service temporarily unavailable', exports.ErrorCodes.SERVICE_TIMEOUT, { retryable: true, cause: error });
            }
            if (networkError.response?.status === 429) {
                return new RateLimitError('External service rate limit exceeded', 60);
            }
            return new ServiceError('external', networkError.message, exports.ErrorCodes.SERVICE_UNAVAILABLE, { cause: error });
        },
    },
];
/**
 * Central error handler manager
 */
class ErrorHandlerManager {
    config;
    logger;
    constructor(config = {}, logger) {
        this.config = {
            includeStackTrace: process.env.NODE_ENV !== 'production',
            logErrors: true,
            reportErrors: process.env.NODE_ENV === 'production',
            reporters: [],
            transformers: [...defaultTransformers, ...(config.transformers ?? [])],
            ...config,
        };
        this.logger = logger ?? {
            debug: (msg, data) => console.debug(JSON.stringify({ level: 'debug', msg, ...data })),
            info: (msg, data) => console.info(JSON.stringify({ level: 'info', msg, ...data })),
            warn: (msg, data) => console.warn(JSON.stringify({ level: 'warn', msg, ...data })),
            error: (msg, data) => console.error(JSON.stringify({ level: 'error', msg, ...data })),
        };
    }
    /**
     * Transform any error to AppError
     */
    normalizeError(error) {
        if (error instanceof AppError) {
            return error;
        }
        // Try custom transformers
        for (const transformer of this.config.transformers) {
            if (transformer.canTransform(error)) {
                return transformer.transform(error);
            }
        }
        // Default transformation
        if (error instanceof Error) {
            return new AppError(error.message, exports.ErrorCodes.INTERNAL_UNEXPECTED, {
                severity: ErrorSeverity.ERROR,
                category: ErrorCategory.PROGRAMMING,
                cause: error,
            });
        }
        return new AppError(String(error), exports.ErrorCodes.INTERNAL_UNEXPECTED, {
            severity: ErrorSeverity.ERROR,
            category: ErrorCategory.PROGRAMMING,
        });
    }
    /**
     * Handle error (log, report, etc.)
     */
    async handleError(error, request) {
        const normalizedError = this.normalizeError(error);
        // Add request context
        if (request) {
            normalizedError.context.requestId = request.id ?? crypto.randomUUID();
            normalizedError.context.metadata = {
                ...normalizedError.context.metadata,
                method: request.method,
                path: request.path,
                ip: request.ip,
                userAgent: request.get('User-Agent'),
            };
        }
        // Log error
        if (this.config.logErrors) {
            this.logError(normalizedError);
        }
        // Report to external services
        if (this.config.reportErrors && !normalizedError.isOperational) {
            await this.reportError(normalizedError, request);
        }
        return normalizedError;
    }
    /**
     * Log error based on severity
     */
    logError(error) {
        const logData = error.toLogFormat();
        switch (error.severity) {
            case ErrorSeverity.DEBUG:
                this.logger.debug('Application error', logData);
                break;
            case ErrorSeverity.INFO:
                this.logger.info('Application error', logData);
                break;
            case ErrorSeverity.WARN:
                this.logger.warn('Application error', logData);
                break;
            case ErrorSeverity.ERROR:
            case ErrorSeverity.CRITICAL:
                this.logger.error('Application error', logData);
                break;
        }
    }
    /**
     * Report error to external services
     */
    async reportError(error, request) {
        const reportPromises = this.config.reporters.map(async (reporter) => {
            try {
                await reporter.report(error, request);
            }
            catch (reportError) {
                this.logger.error('Failed to report error', {
                    reporter: reporter.name,
                    originalError: error.toLogFormat(),
                    reportError: reportError instanceof Error ? reportError.message : String(reportError),
                });
            }
        });
        await Promise.allSettled(reportPromises);
    }
    /**
     * Express error handling middleware
     */
    middleware() {
        return async (err, req, res, _next) => {
            const error = await this.handleError(err, req);
            const response = error.toJSON();
            if (this.config.includeStackTrace && error.stack) {
                response.stack = error.stack;
            }
            // Add retry-after header for rate limit errors
            if (error instanceof RateLimitError) {
                res.setHeader('Retry-After', error.retryAfter);
            }
            // Add correlation ID header
            res.setHeader('X-Correlation-ID', error.context.correlationId ?? '');
            res.status(error.statusCode).json({
                success: false,
                error: response,
            });
        };
    }
    /**
     * Async wrapper for route handlers
     */
    asyncHandler(fn) {
        return (req, res, next) => {
            Promise.resolve(fn(req, res, next)).catch(next);
        };
    }
}
exports.ErrorHandlerManager = ErrorHandlerManager;
const defaultRetryConfig = {
    maxRetries: 3,
    baseDelay: 100,
    maxDelay: 5000,
    exponentialBackoff: true,
    jitter: true,
    retryableErrors: [
        exports.ErrorCodes.DB_CONNECTION_FAILED,
        exports.ErrorCodes.DB_TIMEOUT,
        exports.ErrorCodes.DB_DEADLOCK,
        exports.ErrorCodes.SERVICE_TIMEOUT,
        exports.ErrorCodes.SERVICE_UNAVAILABLE,
    ],
};
/**
 * Retry utility with exponential backoff
 */
async function withRetry(operation, config = {}) {
    const finalConfig = { ...defaultRetryConfig, ...config };
    let lastError = null;
    let attempt = 0;
    while (attempt <= finalConfig.maxRetries) {
        try {
            return await operation();
        }
        catch (error) {
            lastError = error;
            const appError = error instanceof AppError ? error : null;
            // Check if error is retryable
            const isRetryable = appError
                ? (appError.retryable ||
                    (finalConfig.retryableErrors?.includes(appError.code) ?? false))
                : false;
            if (!isRetryable || attempt === finalConfig.maxRetries) {
                throw error;
            }
            // Calculate delay
            let delay = finalConfig.baseDelay;
            if (finalConfig.exponentialBackoff) {
                delay = Math.min(finalConfig.baseDelay * Math.pow(2, attempt), finalConfig.maxDelay);
            }
            if (finalConfig.jitter) {
                delay += Math.random() * delay * 0.1;
            }
            await new Promise((resolve) => setTimeout(resolve, delay));
            attempt++;
        }
    }
    throw lastError ?? new Error('Retry failed');
}
/**
 * Fallback utility for graceful degradation
 */
async function withFallback(primary, fallback, options = {}) {
    try {
        return await primary();
    }
    catch (error) {
        if (options.onFallback) {
            options.onFallback(error);
        }
        return fallback();
    }
}
/**
 * Timeout wrapper
 */
async function withTimeout(operation, timeoutMs, errorMessage = 'Operation timed out') {
    return Promise.race([
        operation(),
        new Promise((_, reject) => setTimeout(() => reject(new ServiceError('timeout', errorMessage, exports.ErrorCodes.SERVICE_TIMEOUT)), timeoutMs)),
    ]);
}
// ============================================================================
// Exports
// ============================================================================
/**
 * Create and export default error handler instance
 */
exports.errorHandler = new ErrorHandlerManager();
exports.default = ErrorHandlerManager;
