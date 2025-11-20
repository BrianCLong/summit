/**
 * Audit logging for security events
 * Tracks authentication, authorization, data access, and configuration changes
 */
import { createLogger } from './logger.js';
import { AuditEventData } from './types.js';
import { getCorrelationId, getUserId, getTenantId } from './context.js';

/**
 * Audit event types for security tracking
 */
export enum AuditEventType {
  // Authentication events
  AUTH_LOGIN_SUCCESS = 'auth.login.success',
  AUTH_LOGIN_FAILURE = 'auth.login.failure',
  AUTH_LOGOUT = 'auth.logout',
  AUTH_TOKEN_REFRESH = 'auth.token.refresh',
  AUTH_PASSWORD_CHANGE = 'auth.password.change',
  AUTH_PASSWORD_RESET = 'auth.password.reset',
  AUTH_MFA_ENABLED = 'auth.mfa.enabled',
  AUTH_MFA_DISABLED = 'auth.mfa.disabled',

  // Authorization events
  AUTHZ_ACCESS_GRANTED = 'authz.access.granted',
  AUTHZ_ACCESS_DENIED = 'authz.access.denied',
  AUTHZ_PERMISSION_GRANTED = 'authz.permission.granted',
  AUTHZ_PERMISSION_REVOKED = 'authz.permission.revoked',
  AUTHZ_ROLE_ASSIGNED = 'authz.role.assigned',
  AUTHZ_ROLE_REMOVED = 'authz.role.removed',

  // Data access events
  DATA_READ = 'data.read',
  DATA_CREATE = 'data.create',
  DATA_UPDATE = 'data.update',
  DATA_DELETE = 'data.delete',
  DATA_EXPORT = 'data.export',
  DATA_IMPORT = 'data.import',

  // Configuration events
  CONFIG_CHANGED = 'config.changed',
  CONFIG_CREATED = 'config.created',
  CONFIG_DELETED = 'config.deleted',

  // Security events
  SECURITY_BREACH_ATTEMPT = 'security.breach.attempt',
  SECURITY_POLICY_VIOLATION = 'security.policy.violation',
  SECURITY_RATE_LIMIT_EXCEEDED = 'security.rate_limit.exceeded',
  SECURITY_SUSPICIOUS_ACTIVITY = 'security.suspicious.activity',

  // Admin events
  ADMIN_USER_CREATED = 'admin.user.created',
  ADMIN_USER_UPDATED = 'admin.user.updated',
  ADMIN_USER_DELETED = 'admin.user.deleted',
  ADMIN_USER_SUSPENDED = 'admin.user.suspended',
  ADMIN_USER_REACTIVATED = 'admin.user.reactivated',
}

/**
 * Audit logger instance
 * Separate from application logs for compliance and security
 */
const auditLogger = createLogger({
  service: 'audit',
  level: 'info',
});

/**
 * Log an audit event
 */
export function logAuditEvent(event: AuditEventData): void {
  // Enrich with context if not provided
  const enrichedEvent: AuditEventData = {
    ...event,
    userId: event.userId || getUserId(),
    tenantId: event.tenantId || getTenantId(),
    timestamp: event.timestamp || new Date().toISOString(),
  };

  // Add correlation ID if available
  const correlationId = getCorrelationId();
  const eventWithContext = correlationId
    ? { ...enrichedEvent, correlationId }
    : enrichedEvent;

  auditLogger.audit(eventWithContext);
}

/**
 * Log authentication success
 */
export function logAuthSuccess(
  userId: string,
  metadata?: Partial<AuditEventData>
): void {
  logAuditEvent({
    action: AuditEventType.AUTH_LOGIN_SUCCESS,
    resourceType: 'authentication',
    userId,
    result: 'success',
    ...metadata,
  });
}

/**
 * Log authentication failure
 */
export function logAuthFailure(
  reason: string,
  metadata?: Partial<AuditEventData>
): void {
  logAuditEvent({
    action: AuditEventType.AUTH_LOGIN_FAILURE,
    resourceType: 'authentication',
    result: 'failure',
    reason,
    ...metadata,
  });
}

/**
 * Log authorization denial
 */
export function logAuthzDenied(
  resourceType: string,
  resourceId: string,
  reason: string,
  metadata?: Partial<AuditEventData>
): void {
  logAuditEvent({
    action: AuditEventType.AUTHZ_ACCESS_DENIED,
    resourceType,
    resourceId,
    result: 'failure',
    reason,
    ...metadata,
  });
}

/**
 * Log data access
 */
export function logDataAccess(
  action: 'read' | 'create' | 'update' | 'delete',
  resourceType: string,
  resourceId?: string,
  metadata?: Partial<AuditEventData>
): void {
  const auditAction = {
    read: AuditEventType.DATA_READ,
    create: AuditEventType.DATA_CREATE,
    update: AuditEventType.DATA_UPDATE,
    delete: AuditEventType.DATA_DELETE,
  }[action];

  logAuditEvent({
    action: auditAction,
    resourceType,
    resourceId,
    result: 'success',
    ...metadata,
  });
}

/**
 * Log configuration change
 */
export function logConfigChange(
  action: 'created' | 'changed' | 'deleted',
  resourceId: string,
  details?: Record<string, unknown>,
  metadata?: Partial<AuditEventData>
): void {
  const auditAction = {
    created: AuditEventType.CONFIG_CREATED,
    changed: AuditEventType.CONFIG_CHANGED,
    deleted: AuditEventType.CONFIG_DELETED,
  }[action];

  logAuditEvent({
    action: auditAction,
    resourceType: 'configuration',
    resourceId,
    details,
    result: 'success',
    ...metadata,
  });
}

/**
 * Log security event
 */
export function logSecurityEvent(
  eventType: AuditEventType,
  reason: string,
  metadata?: Partial<AuditEventData>
): void {
  logAuditEvent({
    action: eventType,
    resourceType: 'security',
    result: 'failure',
    reason,
    ...metadata,
  });
}

/**
 * Log admin action
 */
export function logAdminAction(
  action: string,
  targetUserId: string,
  details?: Record<string, unknown>,
  metadata?: Partial<AuditEventData>
): void {
  logAuditEvent({
    action,
    resourceType: 'user',
    resourceId: targetUserId,
    details,
    result: 'success',
    ...metadata,
  });
}
