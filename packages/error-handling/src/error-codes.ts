/**
 * Standardized Error Codes Catalog for Summit Platform
 *
 * Error Code Format: <CATEGORY>_<SPECIFIC_ERROR>
 * HTTP Status Code Mapping included for each category
 */

export enum ErrorCategory {
  // Client Errors (4xx)
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  RATE_LIMIT = 'RATE_LIMIT',

  // Server Errors (5xx)
  INTERNAL = 'INTERNAL',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  TIMEOUT = 'TIMEOUT',
  CIRCUIT_OPEN = 'CIRCUIT_OPEN',

  // Database Errors
  DATABASE = 'DATABASE',

  // External Service Errors
  EXTERNAL_SERVICE = 'EXTERNAL_SERVICE',
}

export const ErrorCodes = {
  // ==================== VALIDATION ERRORS (400) ====================
  VALIDATION_FAILED: {
    code: 'VALIDATION_FAILED',
    message: 'Request validation failed',
    httpStatus: 400,
    category: ErrorCategory.VALIDATION,
    retryable: false,
  },
  INVALID_INPUT: {
    code: 'INVALID_INPUT',
    message: 'Invalid input provided',
    httpStatus: 400,
    category: ErrorCategory.VALIDATION,
    retryable: false,
  },
  MISSING_REQUIRED_FIELD: {
    code: 'MISSING_REQUIRED_FIELD',
    message: 'Required field is missing',
    httpStatus: 400,
    category: ErrorCategory.VALIDATION,
    retryable: false,
  },
  INVALID_SCHEMA: {
    code: 'INVALID_SCHEMA',
    message: 'Data does not match expected schema',
    httpStatus: 400,
    category: ErrorCategory.VALIDATION,
    retryable: false,
  },

  // ==================== AUTHENTICATION ERRORS (401) ====================
  AUTH_TOKEN_MISSING: {
    code: 'AUTH_TOKEN_MISSING',
    message: 'Authentication token is missing',
    httpStatus: 401,
    category: ErrorCategory.AUTHENTICATION,
    retryable: false,
  },
  AUTH_TOKEN_INVALID: {
    code: 'AUTH_TOKEN_INVALID',
    message: 'Authentication token is invalid',
    httpStatus: 401,
    category: ErrorCategory.AUTHENTICATION,
    retryable: false,
  },
  AUTH_TOKEN_EXPIRED: {
    code: 'AUTH_TOKEN_EXPIRED',
    message: 'Authentication token has expired',
    httpStatus: 401,
    category: ErrorCategory.AUTHENTICATION,
    retryable: false,
  },
  AUTH_FAILED: {
    code: 'AUTH_FAILED',
    message: 'Authentication failed',
    httpStatus: 401,
    category: ErrorCategory.AUTHENTICATION,
    retryable: false,
  },

  // ==================== AUTHORIZATION ERRORS (403) ====================
  FORBIDDEN: {
    code: 'FORBIDDEN',
    message: 'Access forbidden',
    httpStatus: 403,
    category: ErrorCategory.AUTHORIZATION,
    retryable: false,
  },
  INSUFFICIENT_PERMISSIONS: {
    code: 'INSUFFICIENT_PERMISSIONS',
    message: 'Insufficient permissions for this operation',
    httpStatus: 403,
    category: ErrorCategory.AUTHORIZATION,
    retryable: false,
  },
  POLICY_VIOLATION: {
    code: 'POLICY_VIOLATION',
    message: 'Operation violates policy',
    httpStatus: 403,
    category: ErrorCategory.AUTHORIZATION,
    retryable: false,
  },
  BUDGET_EXCEEDED: {
    code: 'BUDGET_EXCEEDED',
    message: 'Operation would exceed budget limits',
    httpStatus: 403,
    category: ErrorCategory.AUTHORIZATION,
    retryable: false,
  },

  // ==================== NOT FOUND ERRORS (404) ====================
  RESOURCE_NOT_FOUND: {
    code: 'RESOURCE_NOT_FOUND',
    message: 'Requested resource not found',
    httpStatus: 404,
    category: ErrorCategory.NOT_FOUND,
    retryable: false,
  },
  ENTITY_NOT_FOUND: {
    code: 'ENTITY_NOT_FOUND',
    message: 'Entity not found',
    httpStatus: 404,
    category: ErrorCategory.NOT_FOUND,
    retryable: false,
  },
  INVESTIGATION_NOT_FOUND: {
    code: 'INVESTIGATION_NOT_FOUND',
    message: 'Investigation not found',
    httpStatus: 404,
    category: ErrorCategory.NOT_FOUND,
    retryable: false,
  },

  // ==================== CONFLICT ERRORS (409) ====================
  RESOURCE_CONFLICT: {
    code: 'RESOURCE_CONFLICT',
    message: 'Resource conflict detected',
    httpStatus: 409,
    category: ErrorCategory.CONFLICT,
    retryable: false,
  },
  DUPLICATE_RESOURCE: {
    code: 'DUPLICATE_RESOURCE',
    message: 'Resource already exists',
    httpStatus: 409,
    category: ErrorCategory.CONFLICT,
    retryable: false,
  },
  REPLAY_DETECTED: {
    code: 'REPLAY_DETECTED',
    message: 'Replay attack detected',
    httpStatus: 409,
    category: ErrorCategory.CONFLICT,
    retryable: false,
  },

  // ==================== RATE LIMIT ERRORS (429) ====================
  RATE_LIMIT_EXCEEDED: {
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Rate limit exceeded',
    httpStatus: 429,
    category: ErrorCategory.RATE_LIMIT,
    retryable: true,
  },
  QUOTA_EXCEEDED: {
    code: 'QUOTA_EXCEEDED',
    message: 'Quota exceeded',
    httpStatus: 429,
    category: ErrorCategory.RATE_LIMIT,
    retryable: true,
  },

  // ==================== INTERNAL SERVER ERRORS (500) ====================
  INTERNAL_SERVER_ERROR: {
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Internal server error',
    httpStatus: 500,
    category: ErrorCategory.INTERNAL,
    retryable: false,
  },
  UNHANDLED_ERROR: {
    code: 'UNHANDLED_ERROR',
    message: 'An unexpected error occurred',
    httpStatus: 500,
    category: ErrorCategory.INTERNAL,
    retryable: false,
  },
  CONFIGURATION_ERROR: {
    code: 'CONFIGURATION_ERROR',
    message: 'Server configuration error',
    httpStatus: 500,
    category: ErrorCategory.INTERNAL,
    retryable: false,
  },

  // ==================== SERVICE UNAVAILABLE ERRORS (503) ====================
  SERVICE_UNAVAILABLE: {
    code: 'SERVICE_UNAVAILABLE',
    message: 'Service temporarily unavailable',
    httpStatus: 503,
    category: ErrorCategory.SERVICE_UNAVAILABLE,
    retryable: true,
  },
  MAINTENANCE_MODE: {
    code: 'MAINTENANCE_MODE',
    message: 'System is in maintenance mode',
    httpStatus: 503,
    category: ErrorCategory.SERVICE_UNAVAILABLE,
    retryable: true,
  },
  DEPENDENCY_UNAVAILABLE: {
    code: 'DEPENDENCY_UNAVAILABLE',
    message: 'Required dependency is unavailable',
    httpStatus: 503,
    category: ErrorCategory.SERVICE_UNAVAILABLE,
    retryable: true,
  },

  // ==================== TIMEOUT ERRORS (504) ====================
  OPERATION_TIMEOUT: {
    code: 'OPERATION_TIMEOUT',
    message: 'Operation timeout',
    httpStatus: 504,
    category: ErrorCategory.TIMEOUT,
    retryable: true,
  },
  GATEWAY_TIMEOUT: {
    code: 'GATEWAY_TIMEOUT',
    message: 'Gateway timeout',
    httpStatus: 504,
    category: ErrorCategory.TIMEOUT,
    retryable: true,
  },
  DATABASE_TIMEOUT: {
    code: 'DATABASE_TIMEOUT',
    message: 'Database operation timeout',
    httpStatus: 504,
    category: ErrorCategory.TIMEOUT,
    retryable: true,
  },

  // ==================== CIRCUIT BREAKER ERRORS (503) ====================
  CIRCUIT_BREAKER_OPEN: {
    code: 'CIRCUIT_BREAKER_OPEN',
    message: 'Circuit breaker is open',
    httpStatus: 503,
    category: ErrorCategory.CIRCUIT_OPEN,
    retryable: true,
  },

  // ==================== DATABASE ERRORS (500/503) ====================
  DATABASE_CONNECTION_FAILED: {
    code: 'DATABASE_CONNECTION_FAILED',
    message: 'Database connection failed',
    httpStatus: 503,
    category: ErrorCategory.DATABASE,
    retryable: true,
  },
  DATABASE_QUERY_FAILED: {
    code: 'DATABASE_QUERY_FAILED',
    message: 'Database query failed',
    httpStatus: 500,
    category: ErrorCategory.DATABASE,
    retryable: true,
  },
  DATABASE_CONSTRAINT_VIOLATION: {
    code: 'DATABASE_CONSTRAINT_VIOLATION',
    message: 'Database constraint violation',
    httpStatus: 409,
    category: ErrorCategory.DATABASE,
    retryable: false,
  },
  NEO4J_ERROR: {
    code: 'NEO4J_ERROR',
    message: 'Neo4j database error',
    httpStatus: 500,
    category: ErrorCategory.DATABASE,
    retryable: true,
  },
  POSTGRES_ERROR: {
    code: 'POSTGRES_ERROR',
    message: 'PostgreSQL database error',
    httpStatus: 500,
    category: ErrorCategory.DATABASE,
    retryable: true,
  },
  REDIS_ERROR: {
    code: 'REDIS_ERROR',
    message: 'Redis error',
    httpStatus: 500,
    category: ErrorCategory.DATABASE,
    retryable: true,
  },

  // ==================== EXTERNAL SERVICE ERRORS (502/503) ====================
  EXTERNAL_SERVICE_ERROR: {
    code: 'EXTERNAL_SERVICE_ERROR',
    message: 'External service error',
    httpStatus: 502,
    category: ErrorCategory.EXTERNAL_SERVICE,
    retryable: true,
  },
  OPA_ERROR: {
    code: 'OPA_ERROR',
    message: 'Policy engine error',
    httpStatus: 502,
    category: ErrorCategory.EXTERNAL_SERVICE,
    retryable: true,
  },
  GRAPHRAG_ERROR: {
    code: 'GRAPHRAG_ERROR',
    message: 'GraphRAG service error',
    httpStatus: 502,
    category: ErrorCategory.EXTERNAL_SERVICE,
    retryable: true,
  },
  JIRA_API_ERROR: {
    code: 'JIRA_API_ERROR',
    message: 'Jira API error',
    httpStatus: 502,
    category: ErrorCategory.EXTERNAL_SERVICE,
    retryable: true,
  },
} as const;

export type ErrorCode = keyof typeof ErrorCodes;

/**
 * Helper to get error definition by code
 */
export function getErrorDefinition(code: ErrorCode) {
  return ErrorCodes[code];
}

/**
 * Check if an error is retryable
 */
export function isRetryableError(code: ErrorCode): boolean {
  return ErrorCodes[code].retryable;
}

/**
 * Get HTTP status for error code
 */
export function getHttpStatus(code: ErrorCode): number {
  return ErrorCodes[code].httpStatus;
}
