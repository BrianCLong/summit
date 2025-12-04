/**
 * Central Authorization Service
 *
 * Provides the core isAllowed() API for authorization decisions
 * Integrates RBAC, ABAC, warrant validation, and license enforcement
 */

import { Pool } from 'pg';
import axios from 'axios';
import pino from 'pino';
import type {
  AuthorizationInput,
  AuthorizationDecision,
  AuthorizationConfig,
  WarrantValidationResult,
  LicenseValidationResult,
  AuthorizationAuditEvent,
  Obligation,
  Condition,
  DecisionTrace,
  Subject,
  Resource,
  Action,
  AuthorizationContext,
  Warrant,
  License,
} from './types';
import { AuthorizationError } from './types';

const logger = pino({ name: 'authz-service' });

export class AuthorizationService {
  private db: Pool;
  private config: AuthorizationConfig;
  private decisionCache: Map<string, { decision: AuthorizationDecision; expiresAt: number }>;

  constructor(config: Partial<AuthorizationConfig> = {}) {
    // Default configuration
    this.config = {
      opaUrl: process.env.OPA_URL || 'http://localhost:8181',
      opaTimeout: parseInt(process.env.OPA_TIMEOUT || '5000', 10),
      opaCacheEnabled: process.env.OPA_CACHE_ENABLED !== 'false',
      opaCacheTtl: parseInt(process.env.OPA_CACHE_TTL || '300000', 10), // 5 minutes
      databaseUrl: process.env.DATABASE_URL || 'postgresql://localhost:5432/intelgraph',
      databasePoolSize: parseInt(process.env.DB_POOL_SIZE || '20', 10),
      failSecure: process.env.NODE_ENV === 'production',
      requirePurpose: process.env.REQUIRE_PURPOSE !== 'false',
      requireWarrantFor: ['EXPORT', 'SHARE', 'DISTRIBUTE'] as Action[],
      requireLicenseFor: ['EXPORT', 'SHARE', 'DISTRIBUTE', 'DOWNLOAD'] as Action[],
      auditEnabled: process.env.AUDIT_ENABLED !== 'false',
      auditStreamUrl: process.env.AUDIT_STREAM_URL,
      cacheEnabled: process.env.CACHE_ENABLED !== 'false',
      cacheTtl: parseInt(process.env.CACHE_TTL || '60000', 10), // 1 minute
      metricsEnabled: process.env.METRICS_ENABLED !== 'false',
      tracingEnabled: process.env.TRACING_ENABLED !== 'false',
      ...config,
    };

    // Initialize database pool
    this.db = new Pool({
      connectionString: this.config.databaseUrl,
      max: this.config.databasePoolSize,
    });

    // Initialize cache
    this.decisionCache = new Map();

    // Periodic cache cleanup
    if (this.config.cacheEnabled) {
      setInterval(() => this.cleanExpiredCache(), 60000); // Every minute
    }
  }

  /**
   * Core authorization API
   * Evaluates whether subject can perform action on resource
   */
  async isAllowed(input: AuthorizationInput): Promise<AuthorizationDecision> {
    const startTime = Date.now();
    const { subject, action, resource, context } = input;

    try {
      // Validate input
      this.validateInput(input);

      // Check cache
      if (this.config.cacheEnabled) {
        const cached = this.getCachedDecision(input);
        if (cached) {
          return cached;
        }
      }

      // Initialize decision trace
      const trace: DecisionTrace = {
        policiesEvaluated: [],
        rulesMatched: [],
        rulesFailed: [],
        evaluationTimeMs: 0,
      };

      // Multi-layered authorization checks
      const obligations: Obligation[] = [];
      const conditions: Condition[] = [];

      // 1. Tenant isolation check
      const tenantCheck = this.checkTenantIsolation(subject, resource);
      conditions.push(tenantCheck);
      if (!tenantCheck.satisfied) {
        return this.denyDecision(
          'Cross-tenant access denied',
          trace,
          startTime,
          { conditions, warrantResult: undefined, licenseResult: undefined }
        );
      }

      // 2. RBAC check (role-based access control)
      const rbacResult = await this.evaluateRBAC(subject, action, resource);
      trace.policiesEvaluated.push('RBAC');
      if (!rbacResult) {
        trace.rulesFailed.push('RBAC');
        return this.denyDecision(
          `Role '${subject.roles.join(',')}' does not permit '${action}' on '${resource.type}'`,
          trace,
          startTime,
          { rbacResult, conditions }
        );
      }
      trace.rulesMatched.push('RBAC');

      // 3. ABAC check (attribute-based access control)
      const abacResult = await this.evaluateABAC(subject, action, resource, context);
      trace.policiesEvaluated.push('ABAC');
      if (!abacResult.allowed) {
        trace.rulesFailed.push('ABAC');
        return this.denyDecision(
          abacResult.reason || 'ABAC policy denied access',
          trace,
          startTime,
          {
            abacResult: false,
            rbacResult,
            conditions,
            opaResult: abacResult.opaResult,
          }
        );
      }
      trace.rulesMatched.push('ABAC');
      if (abacResult.obligations) {
        obligations.push(...abacResult.obligations);
      }

      // 4. Warrant validation (if required)
      let warrantResult: WarrantValidationResult | undefined;
      if (this.requiresWarrant(action, context)) {
        warrantResult = await this.validateWarrant(subject, action, resource, context);
        trace.policiesEvaluated.push('WARRANT');

        if (!warrantResult.valid) {
          trace.rulesFailed.push('WARRANT');
          return this.denyDecision(
            warrantResult.reason || 'Valid warrant required',
            trace,
            startTime,
            {
              rbacResult,
              abacResult: true,
              warrantResult,
              conditions,
              obligations,
            }
          );
        }
        trace.rulesMatched.push('WARRANT');
      }

      // 5. License enforcement (if required)
      let licenseResult: LicenseValidationResult | undefined;
      if (this.requiresLicense(action, context)) {
        licenseResult = await this.validateLicense(subject, action, resource, context);
        trace.policiesEvaluated.push('LICENSE');

        if (!licenseResult.valid) {
          trace.rulesFailed.push('LICENSE');
          return this.denyDecision(
            licenseResult.reason || 'License restrictions prevent this action',
            trace,
            startTime,
            {
              rbacResult,
              abacResult: true,
              warrantResult,
              licenseResult,
              conditions,
              obligations,
            }
          );
        }

        // Add license obligations
        if (licenseResult.conditions) {
          obligations.push(
            ...licenseResult.conditions.map((cond) => ({
              type: cond.type,
              description: cond.requirement,
              requirement: cond.requirement,
              metadata: cond.details,
            }))
          );
        }
        trace.rulesMatched.push('LICENSE');
      }

      // 6. TOS acceptance check (if required)
      const tosAccepted = await this.checkTOSAcceptance(subject, context);
      if (!tosAccepted && this.requiresTOS(action, context)) {
        return this.denyDecision(
          'Terms of Service acceptance required',
          trace,
          startTime,
          {
            rbacResult,
            abacResult: true,
            warrantResult,
            licenseResult,
            tosAccepted: false,
            conditions,
            obligations,
          }
        );
      }

      // 7. Step-up authentication check
      const stepUpRequired = this.requiresStepUp(action, context);
      if (stepUpRequired && !this.hasStepUp(subject, context)) {
        return {
          allowed: false,
          reason: 'Step-up authentication required for this action',
          decidedAt: new Date(),
          rbacResult,
          abacResult: true,
          warrantResult,
          licenseResult,
          tosAccepted,
          obligations,
          conditions,
          requiresStepUp: true,
          stepUpReason: `Action '${action}' requires elevated authentication`,
          minimumAcr: 'loa2',
          decisionTrace: {
            ...trace,
            evaluationTimeMs: Date.now() - startTime,
          },
        };
      }

      // All checks passed - ALLOW
      trace.evaluationTimeMs = Date.now() - startTime;
      const decision: AuthorizationDecision = {
        allowed: true,
        reason: 'Authorization granted',
        decidedAt: new Date(),
        policyVersion: '1.0',
        rbacResult,
        abacResult: true,
        warrantResult,
        licenseResult,
        tosAccepted,
        obligations,
        conditions,
        decisionTrace: trace,
        appealable: false,
      };

      // Cache decision
      if (this.config.cacheEnabled) {
        this.cacheDecision(input, decision);
      }

      // Audit decision
      if (this.config.auditEnabled) {
        await this.auditDecision(input, decision);
      }

      return decision;

    } catch (error) {
      logger.error({ error, subject: subject.id, action, resource: resource.id }, 'Authorization error');

      // Fail-secure in production
      if (this.config.failSecure) {
        return {
          allowed: false,
          reason: 'Authorization service error',
          decidedAt: new Date(),
          decisionTrace: {
            policiesEvaluated: [],
            rulesMatched: [],
            rulesFailed: ['SYSTEM_ERROR'],
            evaluationTimeMs: Date.now() - startTime,
          },
        };
      }

      throw new AuthorizationError(
        'Authorization evaluation failed',
        'AUTHZ_EVALUATION_ERROR',
        500,
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }

  /**
   * Validate input parameters
   */
  private validateInput(input: AuthorizationInput): void {
    const { subject, action, resource, context } = input;

    if (!subject?.id || !subject?.tenantId) {
      throw new AuthorizationError('Invalid subject', 'INVALID_SUBJECT', 400);
    }

    if (!action) {
      throw new AuthorizationError('Invalid action', 'INVALID_ACTION', 400);
    }

    if (!resource?.id || !resource?.type || !resource?.tenantId) {
      throw new AuthorizationError('Invalid resource', 'INVALID_RESOURCE', 400);
    }

    // Require purpose if configured
    if (this.config.requirePurpose && !context?.purpose) {
      throw new AuthorizationError(
        'Purpose is required for all authorization requests',
        'PURPOSE_REQUIRED',
        400
      );
    }
  }

  /**
   * Check tenant isolation
   */
  private checkTenantIsolation(subject: Subject, resource: Resource): Condition {
    const sameTenant = subject.tenantId === resource.tenantId;
    return {
      type: 'TENANT_ISOLATION',
      description: 'Subject and resource must belong to same tenant',
      satisfied: sameTenant,
      reason: sameTenant ? undefined : `Tenant mismatch: ${subject.tenantId} != ${resource.tenantId}`,
    };
  }

  /**
   * Evaluate RBAC (role-based access control)
   */
  private async evaluateRBAC(
    subject: Subject,
    action: Action,
    resource: Resource
  ): Promise<boolean> {
    // Check if user has explicit permission
    const permission = `${resource.type}:${action.toLowerCase()}`;
    if (subject.permissions?.includes(permission)) {
      return true;
    }

    // Check role-based permissions (could be enhanced with database lookup)
    if (subject.roles?.includes('PLATFORM_ADMIN')) {
      return true;
    }

    if (subject.roles?.includes('ADMIN') && resource.tenantId === subject.tenantId) {
      return true;
    }

    // Default: check if permission exists in permissions array
    return subject.permissions?.some((p) => {
      const [resType, resAction] = p.split(':');
      return (resType === resource.type || resType === '*') &&
             (resAction === action.toLowerCase() || resAction === '*');
    }) || false;
  }

  /**
   * Evaluate ABAC (attribute-based access control) via OPA
   */
  private async evaluateABAC(
    subject: Subject,
    action: Action,
    resource: Resource,
    context: AuthorizationContext
  ): Promise<{ allowed: boolean; reason?: string; obligations?: Obligation[]; opaResult?: unknown }> {
    try {
      const opaInput = {
        subject: {
          id: subject.id,
          tenantId: subject.tenantId,
          roles: subject.roles,
          clearance: subject.clearance,
          clearanceLevel: subject.clearanceLevel || 0,
          compartments: subject.compartments || [],
          missionTags: subject.missionTags || [],
          mfaVerified: subject.mfaVerified || false,
        },
        resource: {
          id: resource.id,
          type: resource.type,
          tenantId: resource.tenantId,
          classification: resource.classification,
          classificationLevel: resource.classificationLevel || 0,
          compartments: resource.compartments || [],
          missionTags: resource.missionTags || [],
        },
        action,
        context: {
          requestTime: context.requestTime.toISOString(),
          environment: context.environment,
          purpose: context.purpose,
          ip: context.ip,
          mfaVerified: context.mfaVerified || subject.mfaVerified || false,
        },
      };

      const response = await axios.post(
        `${this.config.opaUrl}/v1/data/intelgraph/authz/allow`,
        { input: opaInput },
        { timeout: this.config.opaTimeout }
      );

      const result = response.data?.result;

      if (typeof result === 'boolean') {
        return { allowed: result, opaResult: result };
      }

      if (result && typeof result === 'object') {
        return {
          allowed: result.allow === true,
          reason: result.reason,
          obligations: result.obligations,
          opaResult: result,
        };
      }

      // No result = deny
      return { allowed: false, reason: 'OPA returned no result' };

    } catch (error) {
      logger.error({ error }, 'OPA evaluation failed');

      // Fail-secure: deny on OPA error in production
      if (this.config.failSecure) {
        return { allowed: false, reason: 'Policy evaluation failed' };
      }

      // In non-production, allow RBAC to determine
      return { allowed: true, reason: 'OPA unavailable, allowing based on RBAC' };
    }
  }

  /**
   * Check if action requires warrant
   */
  private requiresWarrant(action: Action, context: AuthorizationContext): boolean {
    // Explicit warrant required in context
    if (context.warrantRequired) {
      return true;
    }

    // Certain actions always require warrant
    return this.config.requireWarrantFor.includes(action);
  }

  /**
   * Validate warrant for action
   */
  private async validateWarrant(
    subject: Subject,
    action: Action,
    resource: Resource,
    context: AuthorizationContext
  ): Promise<WarrantValidationResult> {
    try {
      // Check if warrant ID provided in context
      const warrantId = context.warrantId;

      if (!warrantId) {
        // Try to find active warrant for resource
        const result = await this.db.query<{ warrant_id: string }>(
          `SELECT get_active_warrant_for_resource($1, $2, $3) as warrant_id`,
          [subject.tenantId, resource.type, resource.id]
        );

        if (!result.rows[0]?.warrant_id) {
          return {
            valid: false,
            reason: `Action '${action}' requires a valid warrant. No active warrant found for this resource.`,
          };
        }

        context.warrantId = result.rows[0].warrant_id;
      }

      // Validate warrant using database function
      const validationResult = await this.db.query<{ is_valid: boolean }>(
        `SELECT is_warrant_valid($1, $2, $3) as is_valid`,
        [context.warrantId, action, resource.type]
      );

      if (!validationResult.rows[0]?.is_valid) {
        return {
          valid: false,
          reason: `Warrant ${context.warrantId} does not permit '${action}' on '${resource.type}'`,
        };
      }

      // Fetch full warrant details
      const warrantResult = await this.db.query<Partial<Warrant>>(
        `SELECT warrant_id, tenant_id, warrant_number, warrant_type, status,
                expiry_date, permitted_actions, scope_description
         FROM warrants
         WHERE warrant_id = $1`,
        [context.warrantId]
      );

      const warrant = warrantResult.rows[0];
      if (!warrant) {
        return { valid: false, reason: 'Warrant not found' };
      }

      // Calculate time until expiry
      let expiresIn: number | undefined;
      if (warrant.expiry_date) {
        const expiryDate = new Date(warrant.expiry_date);
        expiresIn = expiryDate.getTime() - Date.now();
      }

      return {
        valid: true,
        warrant: warrant as Warrant,
        expiresIn,
      };

    } catch (error) {
      logger.error({ error }, 'Warrant validation error');
      return {
        valid: false,
        reason: 'Warrant validation failed',
      };
    }
  }

  /**
   * Check if action requires license check
   */
  private requiresLicense(action: Action, context: AuthorizationContext): boolean {
    if (context.licenseRequired) {
      return true;
    }

    return this.config.requireLicenseFor.includes(action);
  }

  /**
   * Validate license for action
   */
  private async validateLicense(
    subject: Subject,
    action: Action,
    resource: Resource,
    context: AuthorizationContext
  ): Promise<LicenseValidationResult> {
    try {
      // Get active license for resource
      const licenseId = context.licenseId || await this.getActiveLicenseForResource(
        subject.tenantId,
        resource.type,
        resource.id
      );

      if (!licenseId) {
        // No license required (resource not licensed)
        return { valid: true };
      }

      // Check if action is permitted by license
      const permitted = await this.db.query<{ is_permitted: boolean }>(
        `SELECT is_action_permitted_by_license($1, $2) as is_permitted`,
        [licenseId, action]
      );

      if (!permitted.rows[0]?.is_permitted) {
        return {
          valid: false,
          reason: `License does not permit '${action}' action`,
          blockedActions: [action],
        };
      }

      // Fetch license details and conditions
      const licenseResult = await this.db.query<Partial<License>>(
        `SELECT license_id, tenant_id, license_key, license_name, license_type,
                permissions, restrictions, requires_attribution, attribution_text,
                requires_notice, notice_text, export_controlled
         FROM licenses
         WHERE license_id = $1 AND status = 'ACTIVE'`,
        [licenseId]
      );

      const license = licenseResult.rows[0];
      if (!license) {
        return { valid: false, reason: 'License not active' };
      }

      // Build conditions based on license restrictions
      const conditions = [];

      if (license.requires_attribution) {
        conditions.push({
          type: 'ATTRIBUTION' as const,
          requirement: license.attribution_text || 'Attribution required',
          details: { text: license.attribution_text },
        });
      }

      if (license.requires_notice) {
        conditions.push({
          type: 'NOTICE' as const,
          requirement: license.notice_text || 'Notice required',
          details: { text: license.notice_text },
        });
      }

      if (license.export_controlled) {
        conditions.push({
          type: 'EXPORT_CONTROL' as const,
          requirement: 'Subject to export control regulations',
          details: { controlled: true },
        });
      }

      return {
        valid: true,
        license: license as License,
        conditions,
      };

    } catch (error) {
      logger.error({ error }, 'License validation error');
      return {
        valid: false,
        reason: 'License validation failed',
      };
    }
  }

  /**
   * Get active license for resource
   */
  private async getActiveLicenseForResource(
    tenantId: string,
    resourceType: string,
    resourceId: string
  ): Promise<string | null> {
    try {
      const result = await this.db.query<{ license_id: string }>(
        `SELECT get_active_license_for_resource($1, $2, $3) as license_id`,
        [tenantId, resourceType, resourceId]
      );
      return result.rows[0]?.license_id || null;
    } catch (error) {
      logger.error({ error }, 'Failed to get active license');
      return null;
    }
  }

  /**
   * Check TOS acceptance
   */
  private async checkTOSAcceptance(
    subject: Subject,
    context: AuthorizationContext
  ): Promise<boolean> {
    if (context.tosAccepted !== undefined) {
      return context.tosAccepted;
    }

    try {
      const result = await this.db.query<{ has_accepted: boolean }>(
        `SELECT has_user_accepted_tos($1, $2, $3) as has_accepted`,
        [subject.id, '1.0', 'PLATFORM_TOS'] // Version and type should be configurable
      );
      return result.rows[0]?.has_accepted || false;
    } catch (error) {
      logger.error({ error }, 'TOS acceptance check failed');
      return false;
    }
  }

  /**
   * Check if action requires TOS
   */
  private requiresTOS(action: Action, context: AuthorizationContext): boolean {
    // Always require TOS for exports and distributions
    return ['EXPORT', 'SHARE', 'DISTRIBUTE'].includes(action);
  }

  /**
   * Check if action requires step-up authentication
   */
  private requiresStepUp(action: Action, context: AuthorizationContext): boolean {
    if (context.protectedActions?.includes(action)) {
      return true;
    }

    // High-risk actions require step-up
    return ['DELETE', 'EXPORT', 'SHARE'].includes(action);
  }

  /**
   * Check if subject has step-up authentication
   */
  private hasStepUp(subject: Subject, context: AuthorizationContext): boolean {
    const currentAcr = context.currentAcr || subject.acr || 'loa1';
    return currentAcr >= 'loa2' || subject.mfaVerified === true;
  }

  /**
   * Create denial decision
   */
  private denyDecision(
    reason: string,
    trace: DecisionTrace,
    startTime: number,
    details: Partial<AuthorizationDecision>
  ): AuthorizationDecision {
    trace.evaluationTimeMs = Date.now() - startTime;
    return {
      allowed: false,
      reason,
      decidedAt: new Date(),
      decisionTrace: trace,
      appealable: true,
      appealProcess: 'Contact your system administrator to request access',
      ...details,
    };
  }

  /**
   * Cache decision
   */
  private cacheDecision(input: AuthorizationInput, decision: AuthorizationDecision): void {
    const key = this.getCacheKey(input);
    const expiresAt = Date.now() + this.config.cacheTtl;
    this.decisionCache.set(key, { decision, expiresAt });
  }

  /**
   * Get cached decision
   */
  private getCachedDecision(input: AuthorizationInput): AuthorizationDecision | null {
    const key = this.getCacheKey(input);
    const cached = this.decisionCache.get(key);

    if (cached && cached.expiresAt > Date.now()) {
      return cached.decision;
    }

    this.decisionCache.delete(key);
    return null;
  }

  /**
   * Generate cache key
   */
  private getCacheKey(input: AuthorizationInput): string {
    return `${input.subject.id}:${input.action}:${input.resource.type}:${input.resource.id}:${input.context.purpose}`;
  }

  /**
   * Clean expired cache entries
   */
  private cleanExpiredCache(): void {
    const now = Date.now();
    for (const [key, value] of this.decisionCache.entries()) {
      if (value.expiresAt <= now) {
        this.decisionCache.delete(key);
      }
    }
  }

  /**
   * Audit authorization decision
   */
  private async auditDecision(
    input: AuthorizationInput,
    decision: AuthorizationDecision
  ): Promise<void> {
    try {
      const event: Omit<AuthorizationAuditEvent, 'eventId'> = {
        eventType: 'AUTHORIZATION_DECISION',
        tenantId: input.subject.tenantId,
        userId: input.subject.id,
        userEmail: input.subject.email,
        action: input.action,
        resourceType: input.resource.type,
        resourceId: input.resource.id,
        decision: decision.allowed ? 'ALLOW' : 'DENY',
        reason: decision.reason,
        warrantId: input.context.warrantId,
        licenseId: input.context.licenseId,
        purpose: input.context.purpose,
        investigationId: input.context.investigationId,
        ip: input.context.ip,
        userAgent: input.context.userAgent,
        sessionId: input.context.sessionId,
        requestId: input.context.requestId,
        policyVersion: decision.policyVersion,
        minimumNecessaryJustification: input.context.minimumNecessary,
        dataClassification: input.resource.classification,
        timestamp: decision.decidedAt,
        metadata: {
          obligations: decision.obligations,
          conditions: decision.conditions,
          trace: decision.decisionTrace,
        },
      };

      // Insert into audit log
      await this.db.query(
        `INSERT INTO authorization_audit_log
         (tenant_id, user_id, user_email, action, resource_type, resource_id,
          decision, reason, warrant_id, license_id, purpose, investigation_id,
          ip_address, user_agent, session_id, request_id, policy_version,
          minimum_necessary_justification, data_classification, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)`,
        [
          event.tenantId,
          event.userId,
          event.userEmail,
          event.action,
          event.resourceType,
          event.resourceId,
          event.decision,
          event.reason,
          event.warrantId || null,
          event.licenseId || null,
          event.purpose,
          event.investigationId || null,
          event.ip || null,
          event.userAgent || null,
          event.sessionId || null,
          event.requestId || null,
          event.policyVersion || null,
          event.minimumNecessaryJustification || null,
          event.dataClassification || null,
          JSON.stringify(event.metadata),
        ]
      );

      // Stream to audit service if configured
      if (this.config.auditStreamUrl) {
        await axios.post(this.config.auditStreamUrl, event, {
          timeout: 1000,
        }).catch((error) => {
          logger.warn({ error }, 'Failed to stream audit event');
        });
      }

    } catch (error) {
      logger.error({ error }, 'Failed to audit authorization decision');
      // Don't throw - audit failure shouldn't block authorization
    }
  }

  /**
   * Close database connections
   */
  async close(): Promise<void> {
    await this.db.end();
  }
}
