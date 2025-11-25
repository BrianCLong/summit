/**
 * Service Adapter for Audit Logging
 *
 * Provides a simple interface for services to send audit events.
 * Handles correlation ID propagation, context enrichment, and
 * graceful degradation when the audit sink is unavailable.
 *
 * Usage:
 *   const adapter = new ServiceAuditAdapter({
 *     serviceId: 'api-gateway',
 *     serviceName: 'API Gateway',
 *     environment: 'production',
 *   });
 *
 *   await adapter.logAccess({
 *     userId: 'user-123',
 *     resourceType: 'investigation',
 *     resourceId: 'inv-456',
 *     action: 'view',
 *   });
 */

import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';
import { AuditSink, AuditEventInput, SubmitResult } from '../sink/audit-sink.js';

/**
 * Service adapter configuration
 */
export interface ServiceAdapterConfig {
  serviceId: string;
  serviceName: string;
  serviceVersion?: string;
  environment: 'development' | 'staging' | 'production';
  hostId?: string;
  tenantId?: string; // Default tenant if not provided per-event
  defaultTags?: string[];
  sink: AuditSink;
}

/**
 * Context for audit events (passed from request)
 */
export interface AuditContext {
  correlationId?: string;
  sessionId?: string;
  requestId?: string;
  traceId?: string;
  spanId?: string;
  userId?: string;
  userName?: string;
  tenantId?: string;
  organizationId?: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Access event input
 */
export interface AccessEventInput {
  correlationId?: string;
  userId: string;
  action: 'login' | 'logout' | 'session_create' | 'session_expire' | 'mfa_challenge';
  outcome: 'success' | 'failure' | 'denied';
  message?: string;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  mfaMethod?: string;
  failureReason?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Export event input
 */
export interface ExportEventInput {
  correlationId?: string;
  userId: string;
  resourceType: string;
  resourceId?: string;
  resourceIds?: string[];
  exportFormat: string;
  recordCount: number;
  outcome: 'success' | 'failure' | 'partial';
  message?: string;
  dataClassification?: string;
  approvalId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Admin change event input
 */
export interface AdminChangeEventInput {
  correlationId?: string;
  userId: string;
  action: string;
  targetType: 'user' | 'role' | 'permission' | 'config' | 'policy' | 'tenant';
  targetId: string;
  targetName?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  outcome: 'success' | 'failure';
  message?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Policy change event input
 */
export interface PolicyChangeEventInput {
  correlationId?: string;
  userId: string;
  policyType: 'rbac' | 'abac' | 'opa' | 'governance' | 'dlp' | 'retention';
  policyId: string;
  policyName: string;
  action: 'create' | 'update' | 'delete' | 'enable' | 'disable';
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  outcome: 'success' | 'failure';
  message?: string;
  affectedResources?: string[];
  metadata?: Record<string, unknown>;
}

/**
 * Model selection event input
 */
export interface ModelSelectionEventInput {
  correlationId?: string;
  userId?: string;
  modelId: string;
  modelName: string;
  modelVersion: string;
  action: 'select' | 'inference' | 'training' | 'update' | 'deploy';
  inputSummary?: string;
  outputSummary?: string;
  outcome: 'success' | 'failure';
  message?: string;
  duration?: number;
  tokenCount?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Security event input
 */
export interface SecurityEventInput {
  correlationId?: string;
  userId?: string;
  eventType:
    | 'alert'
    | 'anomaly'
    | 'intrusion'
    | 'breach'
    | 'brute_force'
    | 'rate_limit'
    | 'dlp_violation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  sourceIp?: string;
  targetResource?: string;
  indicators?: string[];
  recommendedActions?: string[];
  metadata?: Record<string, unknown>;
}

/**
 * Generic resource event input
 */
export interface ResourceEventInput {
  correlationId?: string;
  userId?: string;
  resourceType: string;
  resourceId: string;
  resourceName?: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'archive' | 'restore';
  outcome: 'success' | 'failure' | 'partial' | 'denied';
  message?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

/**
 * Service adapter for sending audit events
 */
export class ServiceAuditAdapter extends EventEmitter {
  private config: ServiceAdapterConfig;
  private defaultContext: AuditContext = {};

  constructor(config: ServiceAdapterConfig) {
    super();
    this.config = config;
  }

  /**
   * Set default context for all events
   */
  setDefaultContext(context: AuditContext): void {
    this.defaultContext = context;
  }

  /**
   * Log an access event (login, logout, session management)
   */
  async logAccess(
    input: AccessEventInput,
    context?: AuditContext,
  ): Promise<SubmitResult> {
    const eventType = this.mapAccessAction(input.action);

    return this.submitEvent({
      eventType,
      level: input.outcome === 'failure' ? 'warn' : 'info',
      correlationId: input.correlationId || context?.correlationId || randomUUID(),
      action: input.action,
      outcome: input.outcome,
      message: input.message || `User ${input.action} ${input.outcome}`,
      userId: input.userId,
      criticalCategory: 'access',
      complianceRelevant: true,
      complianceFrameworks: ['SOC2', 'ISO27001'],
      ipAddress: input.ipAddress || context?.ipAddress,
      userAgent: input.userAgent || context?.userAgent,
      sessionId: input.sessionId || context?.sessionId,
      details: {
        mfaMethod: input.mfaMethod,
        failureReason: input.failureReason,
      },
      metadata: input.metadata,
    }, context);
  }

  /**
   * Log an export event (data export, report generation)
   */
  async logExport(
    input: ExportEventInput,
    context?: AuditContext,
  ): Promise<SubmitResult> {
    return this.submitEvent({
      eventType: 'data_export',
      level: input.outcome === 'failure' ? 'error' : 'info',
      correlationId: input.correlationId || context?.correlationId || randomUUID(),
      action: 'export',
      outcome: input.outcome,
      message: input.message || `Data export ${input.outcome}`,
      userId: input.userId,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      criticalCategory: 'export',
      complianceRelevant: true,
      complianceFrameworks: ['SOC2', 'GDPR', 'HIPAA'],
      details: {
        exportFormat: input.exportFormat,
        recordCount: input.recordCount,
        resourceIds: input.resourceIds,
        dataClassification: input.dataClassification,
        approvalId: input.approvalId,
      },
      metadata: input.metadata,
    }, context);
  }

  /**
   * Log an admin change event
   */
  async logAdminChange(
    input: AdminChangeEventInput,
    context?: AuditContext,
  ): Promise<SubmitResult> {
    return this.submitEvent({
      eventType: this.mapAdminAction(input.action, input.targetType),
      level: input.outcome === 'failure' ? 'error' : 'warn',
      correlationId: input.correlationId || context?.correlationId || randomUUID(),
      action: input.action,
      outcome: input.outcome,
      message: input.message || `Admin ${input.action} on ${input.targetType}`,
      userId: input.userId,
      resourceType: input.targetType,
      resourceId: input.targetId,
      resourceName: input.targetName,
      criticalCategory: 'admin_change',
      complianceRelevant: true,
      complianceFrameworks: ['SOC2', 'SOX', 'ISO27001'],
      oldValues: input.oldValues,
      newValues: input.newValues,
      metadata: input.metadata,
    }, context);
  }

  /**
   * Log a policy change event
   */
  async logPolicyChange(
    input: PolicyChangeEventInput,
    context?: AuditContext,
  ): Promise<SubmitResult> {
    return this.submitEvent({
      eventType: 'policy_update',
      level: 'warn',
      correlationId: input.correlationId || context?.correlationId || randomUUID(),
      action: input.action,
      outcome: input.outcome,
      message: input.message || `Policy ${input.action}: ${input.policyName}`,
      userId: input.userId,
      resourceType: 'policy',
      resourceId: input.policyId,
      resourceName: input.policyName,
      criticalCategory: 'policy_change',
      complianceRelevant: true,
      complianceFrameworks: ['SOC2', 'SOX', 'NIST', 'ISO27001'],
      oldValues: input.oldValues,
      newValues: input.newValues,
      details: {
        policyType: input.policyType,
        affectedResources: input.affectedResources,
      },
      metadata: input.metadata,
    }, context);
  }

  /**
   * Log a model selection event (AI/ML)
   */
  async logModelSelection(
    input: ModelSelectionEventInput,
    context?: AuditContext,
  ): Promise<SubmitResult> {
    return this.submitEvent({
      eventType: this.mapModelAction(input.action),
      level: input.outcome === 'failure' ? 'error' : 'info',
      correlationId: input.correlationId || context?.correlationId || randomUUID(),
      action: input.action,
      outcome: input.outcome,
      message: input.message || `AI model ${input.action}: ${input.modelName}`,
      userId: input.userId,
      resourceType: 'ai_model',
      resourceId: input.modelId,
      resourceName: input.modelName,
      criticalCategory: 'model_selection',
      complianceRelevant: true,
      complianceFrameworks: ['SOC2', 'NIST'],
      details: {
        modelVersion: input.modelVersion,
        inputSummary: input.inputSummary,
        outputSummary: input.outputSummary,
        tokenCount: input.tokenCount,
        duration: input.duration,
      },
      metadata: input.metadata,
    }, context);
  }

  /**
   * Log a security event
   */
  async logSecurity(
    input: SecurityEventInput,
    context?: AuditContext,
  ): Promise<SubmitResult> {
    const levelMap: Record<string, 'info' | 'warn' | 'error' | 'critical'> = {
      low: 'info',
      medium: 'warn',
      high: 'error',
      critical: 'critical',
    };

    return this.submitEvent({
      eventType: this.mapSecurityEventType(input.eventType),
      level: levelMap[input.severity],
      correlationId: input.correlationId || context?.correlationId || randomUUID(),
      action: input.eventType,
      outcome: 'success', // Security events are observations
      message: input.description,
      userId: input.userId,
      criticalCategory: 'security',
      complianceRelevant: true,
      complianceFrameworks: ['SOC2', 'NIST', 'ISO27001'],
      ipAddress: input.sourceIp,
      details: {
        severity: input.severity,
        targetResource: input.targetResource,
        indicators: input.indicators,
        recommendedActions: input.recommendedActions,
      },
      metadata: input.metadata,
    }, context);
  }

  /**
   * Log a generic resource event
   */
  async logResource(
    input: ResourceEventInput,
    context?: AuditContext,
  ): Promise<SubmitResult> {
    return this.submitEvent({
      eventType: `resource_${input.action}`,
      level: input.outcome === 'failure' ? 'warn' : 'info',
      correlationId: input.correlationId || context?.correlationId || randomUUID(),
      action: input.action,
      outcome: input.outcome,
      message: input.message || `Resource ${input.action} ${input.outcome}`,
      userId: input.userId,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      resourceName: input.resourceName,
      complianceRelevant: false,
      oldValues: input.oldValues,
      newValues: input.newValues,
      metadata: input.metadata,
    }, context);
  }

  /**
   * Log a custom event
   */
  async logCustom(
    input: Partial<AuditEventInput> & {
      eventType: string;
      action: string;
      message: string;
    },
    context?: AuditContext,
  ): Promise<SubmitResult> {
    return this.submitEvent({
      level: 'info',
      outcome: 'success',
      complianceRelevant: false,
      ...input,
      correlationId: input.correlationId || context?.correlationId || randomUUID(),
    }, context);
  }

  /**
   * Submit event to the sink
   */
  private async submitEvent(
    event: Partial<AuditEventInput>,
    context?: AuditContext,
  ): Promise<SubmitResult> {
    const mergedContext = { ...this.defaultContext, ...context };

    const fullEvent: AuditEventInput = {
      eventType: event.eventType || 'unknown',
      level: event.level || 'info',
      correlationId: event.correlationId || mergedContext.correlationId || randomUUID(),
      tenantId: mergedContext.tenantId || this.config.tenantId || 'default',
      serviceId: this.config.serviceId,
      serviceName: this.config.serviceName,
      environment: this.config.environment,
      action: event.action || 'unknown',
      outcome: event.outcome || 'success',
      message: event.message || '',
      details: event.details,
      userId: event.userId || mergedContext.userId,
      resourceType: event.resourceType,
      resourceId: event.resourceId,
      criticalCategory: event.criticalCategory,
      complianceRelevant: event.complianceRelevant,
      complianceFrameworks: event.complianceFrameworks,
      ipAddress: event.ipAddress || mergedContext.ipAddress,
      userAgent: event.userAgent || mergedContext.userAgent,
      sessionId: event.sessionId || mergedContext.sessionId,
      requestId: event.requestId || mergedContext.requestId,
      traceId: event.traceId || mergedContext.traceId,
      spanId: event.spanId || mergedContext.spanId,
      oldValues: event.oldValues,
      newValues: event.newValues,
      tags: [...(this.config.defaultTags || []), ...(event.tags || [])],
      metadata: event.metadata,
    };

    try {
      const result = await this.config.sink.submit(fullEvent);

      if (!result.success) {
        this.emit('submitFailed', { event: fullEvent, error: result.error });
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.emit('error', { event: fullEvent, error: errorMessage });

      return {
        success: false,
        eventId: '',
        queued: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Map access action to event type
   */
  private mapAccessAction(action: string): string {
    const mapping: Record<string, string> = {
      login: 'user_login',
      logout: 'user_logout',
      session_create: 'session_created',
      session_expire: 'session_expired',
      mfa_challenge: 'mfa_challenge',
    };
    return mapping[action] || `access_${action}`;
  }

  /**
   * Map admin action to event type
   */
  private mapAdminAction(action: string, targetType: string): string {
    if (targetType === 'user') {
      return action === 'delete' ? 'user_deleted' : `user_${action}`;
    }
    if (targetType === 'role') {
      return action === 'assign' ? 'role_assigned' : `role_${action}`;
    }
    if (targetType === 'permission') {
      return action === 'grant' ? 'permission_granted' : 'permission_revoked';
    }
    return `admin_${action}_${targetType}`;
  }

  /**
   * Map model action to event type
   */
  private mapModelAction(action: string): string {
    const mapping: Record<string, string> = {
      select: 'ai_model_selected',
      inference: 'ai_inference_request',
      training: 'ai_model_update',
      update: 'ai_model_update',
      deploy: 'ai_model_update',
    };
    return mapping[action] || `ai_${action}`;
  }

  /**
   * Map security event type
   */
  private mapSecurityEventType(eventType: string): string {
    const mapping: Record<string, string> = {
      alert: 'security_alert',
      anomaly: 'anomaly_detected',
      intrusion: 'intrusion_detected',
      breach: 'data_breach',
      brute_force: 'brute_force_detected',
      rate_limit: 'rate_limit_exceeded',
      dlp_violation: 'dlp_violation',
    };
    return mapping[eventType] || `security_${eventType}`;
  }
}
