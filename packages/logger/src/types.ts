/**
 * Types for structured logging system
 */

export type LogLevel = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';

export interface LogMetadata {
  correlationId?: string;
  userId?: string;
  tenantId?: string;
  service?: string;
  environment?: string;
  version?: string;
  [key: string]: unknown;
}

export interface AuditEventData {
  userId?: string;
  tenantId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  timestamp?: string;
  result?: 'success' | 'failure';
  reason?: string;
}

export interface LoggerConfig {
  level?: LogLevel;
  pretty?: boolean;
  redactPaths?: string[];
  destination?: string;
  rotation?: {
    maxSize?: string;
    maxFiles?: number;
    compress?: boolean;
  };
  service?: string;
  environment?: string;
  version?: string;
}

export interface StructuredLogger {
  trace(msg: string, metadata?: LogMetadata): void;
  debug(msg: string, metadata?: LogMetadata): void;
  info(msg: string, metadata?: LogMetadata): void;
  warn(msg: string, metadata?: LogMetadata): void;
  error(msg: string, metadata?: LogMetadata): void;
  error(error: Error, metadata?: LogMetadata): void;
  fatal(msg: string, metadata?: LogMetadata): void;

  child(bindings: LogMetadata): StructuredLogger;

  // Audit logging
  audit(event: AuditEventData): void;
}
