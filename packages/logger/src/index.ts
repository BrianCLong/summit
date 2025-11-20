/**
 * @intelgraph/logger
 * Structured logging with correlation IDs and audit trails
 */

// Core logger
export { createLogger, logger } from './logger.js';

// Types
export type {
  LogLevel,
  LogMetadata,
  AuditEventData,
  LoggerConfig,
  StructuredLogger,
} from './types.js';

// Context management
export {
  getLogContext,
  setLogContext,
  runWithContext,
  getCorrelationId,
  setCorrelationId,
  getUserId,
  setUserId,
  getTenantId,
  setTenantId,
  clearLogContext,
  withContext,
} from './context.js';

// Audit logging
export {
  AuditEventType,
  logAuditEvent,
  logAuthSuccess,
  logAuthFailure,
  logAuthzDenied,
  logDataAccess,
  logConfigChange,
  logSecurityEvent,
  logAdminAction,
} from './audit.js';

// Redaction utilities
export {
  DEFAULT_REDACT_PATHS,
  SENSITIVE_FIELD_PATTERNS,
  isSensitiveField,
  redactSensitiveData,
  redactEmail,
  redactCreditCard,
  redactSSN,
  redactPhone,
} from './redaction.js';
