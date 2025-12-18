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

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

// ============================================================================
// Error Codes and Categories
// ============================================================================

/**
 * Standardized error codes for the IntelGraph platform
 */
export const ErrorCodes = {
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
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  CRITICAL = 'critical',
}

/**
 * Error categories for handling strategy
 */
export enum ErrorCategory {
  /** Operational errors - expected, recoverable */
  OPERATIONAL = 'operational',
  /** Programming errors - bugs, should crash in development */
  PROGRAMMING = 'programming',
  /** Transient errors - temporary, should retry */
  TRANSIENT = 'transient',
  /** Security errors - potential attacks */
  SECURITY = 'security',
}

// ============================================================================
// Base Error Classes
// ============================================================================

/**
 * Error context for tracing and debugging
 */
export interface ErrorContext {
  correlationId?: string;
  requestId?: string;
  userId?: string;
  tenantId?: string;
  operation?: string;
  component?: string;
  metadata?: Record<string, unknown>;
  stack?: string;
  cause?: Error;
}

/**
 * Serialized error for logging and API responses
 */
export interface SerializedError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  correlationId?: string;
  timestamp: string;
  path?: string;
}

/**
 * Base application error class
 */
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly severity: ErrorSeverity;
  public readonly category: ErrorCategory;
  public readonly isOperational: boolean;
  public readonly context: ErrorContext;
  public readonly timestamp: Date;
  public readonly retryable: boolean;

  constructor(
    message: string,
    code: ErrorCode = ErrorCodes.INTERNAL_ERROR,
    options: {
      statusCode?: number;
      severity?: ErrorSeverity;
      category?: ErrorCategory;
      context?: ErrorContext;
      retryable?: boolean;
      cause?: Error;
    } = {}
  ) {
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
  toJSON(): SerializedError {
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
  toLogFormat(): Record<string, unknown> {
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

// ============================================================================
// Specific Error Classes
// ============================================================================

/**
 * Authentication/Authorization errors
 */
export class AuthenticationError extends AppError {
  constructor(
    message: string,
    code: ErrorCode = ErrorCodes.AUTH_INVALID_TOKEN,
    context?: ErrorContext
  ) {
    super(message, code, {
      statusCode: 401,
      severity: ErrorSeverity.WARN,
      category: ErrorCategory.SECURITY,
      context,
    });
  }
}

export class AuthorizationError extends AppError {
  constructor(
    message: string,
    code: ErrorCode = ErrorCodes.AUTH_INSUFFICIENT_PERMISSIONS,
    context?: ErrorContext
  ) {
    super(message, code, {
      statusCode: 403,
      severity: ErrorSeverity.WARN,
      category: ErrorCategory.SECURITY,
      context,
    });
  }
}

/**
 * Validation errors
 */
export class ValidationError extends AppError {
  public readonly validationErrors: Array<{
    field: string;
    message: string;
    value?: unknown;
  }>;

  constructor(
    message: string,
    validationErrors: Array<{ field: string; message: string; value?: unknown }> = [],
    context?: ErrorContext
  ) {
    super(message, ErrorCodes.VALIDATION_FAILED, {
      statusCode: 400,
      severity: ErrorSeverity.INFO,
      category: ErrorCategory.OPERATIONAL,
      context,
    });
    this.validationErrors = validationErrors;
  }

  toJSON(): SerializedError {
    return {
      ...super.toJSON(),
      details: { validationErrors: this.validationErrors },
    };
  }
}

/**
 * Resource errors
 */
export class NotFoundError extends AppError {
  constructor(
    resource: string,
    identifier?: string,
    context?: ErrorContext
  ) {
    const message = identifier
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;

    super(message, ErrorCodes.RESOURCE_NOT_FOUND, {
      statusCode: 404,
      severity: ErrorSeverity.INFO,
      category: ErrorCategory.OPERATIONAL,
      context: { ...context, metadata: { resource, identifier } },
    });
  }
}

export class ConflictError extends AppError {
  constructor(
    message: string,
    context?: ErrorContext
  ) {
    super(message, ErrorCodes.RESOURCE_CONFLICT, {
      statusCode: 409,
      severity: ErrorSeverity.WARN,
      category: ErrorCategory.OPERATIONAL,
      context,
    });
  }
}

/**
 * Database errors
 */
export class DatabaseError extends AppError {
  constructor(
    message: string,
    code: ErrorCode = ErrorCodes.DB_QUERY_FAILED,
    options: {
      context?: ErrorContext;
      cause?: Error;
      retryable?: boolean;
    } = {}
  ) {
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

/**
 * External service errors
 */
export class ServiceError extends AppError {
  public readonly serviceName: string;

  constructor(
    serviceName: string,
    message: string,
    code: ErrorCode = ErrorCodes.SERVICE_UNAVAILABLE,
    options: {
      context?: ErrorContext;
      cause?: Error;
      retryable?: boolean;
    } = {}
  ) {
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

/**
 * Rate limiting error
 */
export class RateLimitError extends AppError {
  public readonly retryAfter: number;

  constructor(
    message: string = 'Rate limit exceeded',
    retryAfter: number = 60,
    context?: ErrorContext
  ) {
    super(message, ErrorCodes.AUTH_RATE_LIMITED, {
      statusCode: 429,
      severity: ErrorSeverity.WARN,
      category: ErrorCategory.OPERATIONAL,
      context,
    });
    this.retryAfter = retryAfter;
  }

  toJSON(): SerializedError {
    return {
      ...super.toJSON(),
      details: { retryAfter: this.retryAfter },
    };
  }
}

/**
 * Business logic errors
 */
export class BusinessError extends AppError {
  constructor(
    message: string,
    code: ErrorCode = ErrorCodes.BUSINESS_RULE_VIOLATION,
    context?: ErrorContext
  ) {
    super(message, code, {
      statusCode: 422,
      severity: ErrorSeverity.WARN,
      category: ErrorCategory.OPERATIONAL,
      context,
    });
  }
}

// ============================================================================
// Error Handler Manager
// ============================================================================

/**
 * Error handler configuration
 */
export interface ErrorHandlerConfig {
  /** Include stack traces in responses */
  includeStackTrace: boolean;
  /** Log all errors */
  logErrors: boolean;
  /** Report errors to external service */
  reportErrors: boolean;
  /** Custom error reporters */
  reporters: ErrorReporter[];
  /** Error transformation hooks */
  transformers: ErrorTransformer[];
}

/**
 * Error reporter interface
 */
export interface ErrorReporter {
  name: string;
  report(error: AppError, request?: Request): Promise<void>;
}

/**
 * Error transformer interface
 */
export interface ErrorTransformer {
  canTransform(error: unknown): boolean;
  transform(error: unknown): AppError;
}

/**
 * Default error transformers
 */
const defaultTransformers: ErrorTransformer[] = [
  // PostgreSQL errors
  {
    canTransform: (error: unknown): boolean => {
      return typeof error === 'object' && error !== null && 'code' in error;
    },
    transform: (error: unknown): AppError => {
      const pgError = error as { code: string; message: string; detail?: string };

      switch (pgError.code) {
        case '23505': // unique_violation
          return new ConflictError(
            pgError.detail ?? 'Duplicate entry exists',
            { metadata: { pgCode: pgError.code } }
          );
        case '23503': // foreign_key_violation
          return new ValidationError(
            'Referenced resource does not exist',
            [{ field: 'reference', message: pgError.detail ?? 'Invalid reference' }]
          );
        case '23502': // not_null_violation
          return new ValidationError(
            'Required field is missing',
            [{ field: 'unknown', message: pgError.message }]
          );
        case '57P01': // admin_shutdown
        case '57P02': // crash_shutdown
        case '57P03': // cannot_connect_now
          return new DatabaseError(
            'Database temporarily unavailable',
            ErrorCodes.DB_CONNECTION_FAILED,
            { retryable: true, cause: error as Error }
          );
        case '40001': // serialization_failure
          return new DatabaseError(
            'Transaction conflict, please retry',
            ErrorCodes.DB_DEADLOCK,
            { retryable: true, cause: error as Error }
          );
        default:
          return new DatabaseError(
            pgError.message,
            ErrorCodes.DB_QUERY_FAILED,
            { cause: error as Error }
          );
      }
    },
  },
  // JWT errors
  {
    canTransform: (error: unknown): boolean => {
      return error instanceof Error && (
        error.name === 'JsonWebTokenError' ||
        error.name === 'TokenExpiredError' ||
        error.name === 'NotBeforeError'
      );
    },
    transform: (error: unknown): AppError => {
      const jwtError = error as Error;

      if (jwtError.name === 'TokenExpiredError') {
        return new AuthenticationError(
          'Token has expired',
          ErrorCodes.AUTH_TOKEN_EXPIRED
        );
      }

      return new AuthenticationError(
        'Invalid token',
        ErrorCodes.AUTH_INVALID_TOKEN
      );
    },
  },
  // Axios/fetch errors
  {
    canTransform: (error: unknown): boolean => {
      return typeof error === 'object' && error !== null && (
        'isAxiosError' in error ||
        (error as Error).name === 'FetchError'
      );
    },
    transform: (error: unknown): AppError => {
      const networkError = error as {
        response?: { status: number };
        code?: string;
        message: string;
      };

      if (networkError.code === 'ECONNREFUSED' || networkError.code === 'ETIMEDOUT') {
        return new ServiceError(
          'external',
          'Service temporarily unavailable',
          ErrorCodes.SERVICE_TIMEOUT,
          { retryable: true, cause: error as Error }
        );
      }

      if (networkError.response?.status === 429) {
        return new RateLimitError(
          'External service rate limit exceeded',
          60
        );
      }

      return new ServiceError(
        'external',
        networkError.message,
        ErrorCodes.SERVICE_UNAVAILABLE,
        { cause: error as Error }
      );
    },
  },
];

/**
 * Central error handler manager
 */
export class ErrorHandlerManager {
  private config: ErrorHandlerConfig;
  private logger: {
    debug: (msg: string, data?: unknown) => void;
    info: (msg: string, data?: unknown) => void;
    warn: (msg: string, data?: unknown) => void;
    error: (msg: string, data?: unknown) => void;
  };

  constructor(
    config: Partial<ErrorHandlerConfig> = {},
    logger?: ErrorHandlerManager['logger']
  ) {
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
  normalizeError(error: unknown): AppError {
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
      return new AppError(
        error.message,
        ErrorCodes.INTERNAL_UNEXPECTED,
        {
          severity: ErrorSeverity.ERROR,
          category: ErrorCategory.PROGRAMMING,
          cause: error,
        }
      );
    }

    return new AppError(
      String(error),
      ErrorCodes.INTERNAL_UNEXPECTED,
      {
        severity: ErrorSeverity.ERROR,
        category: ErrorCategory.PROGRAMMING,
      }
    );
  }

  /**
   * Handle error (log, report, etc.)
   */
  async handleError(error: unknown, request?: Request): Promise<AppError> {
    const normalizedError = this.normalizeError(error);

    // Add request context
    if (request) {
      normalizedError.context.requestId = (request as any).id ?? crypto.randomUUID();
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
  private logError(error: AppError): void {
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
  private async reportError(error: AppError, request?: Request): Promise<void> {
    const reportPromises = this.config.reporters.map(async (reporter) => {
      try {
        await reporter.report(error, request);
      } catch (reportError) {
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
  middleware(): (err: unknown, req: Request, res: Response, next: NextFunction) => void {
    return async (err: unknown, req: Request, res: Response, _next: NextFunction): Promise<void> => {
      const error = await this.handleError(err, req);

      const response: SerializedError = error.toJSON();

      if (this.config.includeStackTrace && error.stack) {
        (response as any).stack = error.stack;
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
  asyncHandler<T>(
    fn: (req: Request, res: Response, next: NextFunction) => Promise<T>
  ): (req: Request, res: Response, next: NextFunction) => void {
    return (req: Request, res: Response, next: NextFunction): void => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }
}

// ============================================================================
// Error Recovery Strategies
// ============================================================================

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  exponentialBackoff: boolean;
  jitter: boolean;
  retryableErrors?: ErrorCode[];
}

const defaultRetryConfig: RetryConfig = {
  maxRetries: 3,
  baseDelay: 100,
  maxDelay: 5000,
  exponentialBackoff: true,
  jitter: true,
  retryableErrors: [
    ErrorCodes.DB_CONNECTION_FAILED,
    ErrorCodes.DB_TIMEOUT,
    ErrorCodes.DB_DEADLOCK,
    ErrorCodes.SERVICE_TIMEOUT,
    ErrorCodes.SERVICE_UNAVAILABLE,
  ],
};

/**
 * Retry utility with exponential backoff
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const finalConfig = { ...defaultRetryConfig, ...config };
  let lastError: Error | null = null;
  let attempt = 0;

  while (attempt <= finalConfig.maxRetries) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
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
        delay = Math.min(
          finalConfig.baseDelay * Math.pow(2, attempt),
          finalConfig.maxDelay
        );
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
export async function withFallback<T>(
  primary: () => Promise<T>,
  fallback: () => Promise<T> | T,
  options: {
    onFallback?: (error: Error) => void;
  } = {}
): Promise<T> {
  try {
    return await primary();
  } catch (error) {
    if (options.onFallback) {
      options.onFallback(error as Error);
    }
    return fallback();
  }
}

/**
 * Timeout wrapper
 */
export async function withTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number,
  errorMessage: string = 'Operation timed out'
): Promise<T> {
  return Promise.race([
    operation(),
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new ServiceError('timeout', errorMessage, ErrorCodes.SERVICE_TIMEOUT)),
        timeoutMs
      )
    ),
  ]);
}

// ============================================================================
// Exports
// ============================================================================

/**
 * Create and export default error handler instance
 */
export const errorHandler = new ErrorHandlerManager();

export default ErrorHandlerManager;
