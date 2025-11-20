/**
 * Governed Investigation Resolvers
 *
 * Implements case graph viewing with full governance:
 * - Tenant + ABAC enforcement
 * - Warrant/authority annotation
 * - Audit logging (who/what/why/when)
 * - Policy tag filtering
 * - Field-level redaction
 */

import { AuthenticationError, ForbiddenError } from 'apollo-server-express';
import { Driver } from 'neo4j-driver';
import { OPAClient } from '../../middleware/opa-abac';
import { WarrantService } from '../../services/WarrantService';
import { AdvancedAuditSystem } from '../../audit/advanced-audit-system';
import { GovernanceContext } from '../../middleware/governance';
import { Logger } from 'pino';

export interface InvestigationContext {
  user: any;
  opa: OPAClient;
  neo4j: Driver;
  warrantService: WarrantService;
  auditSystem: AdvancedAuditSystem;
  governance: GovernanceContext;
  warrant?: any;
  requestId: string;
  sessionId?: string;
  req: any;
  logger: Logger;
}

export interface CaseGraphResult {
  investigation: any;
  entities: any[];
  relationships: any[];
  governanceMetadata: {
    policyTags: any;
    warrantId?: string;
    warrantNumber?: string;
    purpose: string;
    legalBasis: string[];
    reasonForAccess: string;
    redactedFields: string[];
    accessGrantedAt: string;
    auditTrailId: string;
    policyEvaluationTimeMs: number;
  };
}

/**
 * Get investigation case graph with full governance
 */
export async function getInvestigationCaseGraph(
  _parent: any,
  args: { investigationId: string; depth?: number },
  context: InvestigationContext,
): Promise<CaseGraphResult> {
  const { investigationId, depth = 3 } = args;
  const {
    user,
    opa,
    neo4j,
    warrantService,
    auditSystem,
    governance,
    warrant,
    requestId,
    sessionId,
    req,
    logger,
  } = context;

  const correlationId = requestId;
  const startTime = Date.now();

  // ============================================================================
  // 1. AUTHENTICATION
  // ============================================================================

  if (!user) {
    throw new AuthenticationError('Authentication required to access case graph');
  }

  // ============================================================================
  // 2. VALIDATE GOVERNANCE CONTEXT
  // ============================================================================

  if (!governance) {
    throw new ForbiddenError('Governance context is required');
  }

  if (!governance.purpose) {
    throw new ForbiddenError('Purpose header (X-Purpose) is required');
  }

  if (!governance.reasonForAccess) {
    throw new ForbiddenError('Reason for access header (X-Reason-For-Access) is required');
  }

  // ============================================================================
  // 3. FETCH INVESTIGATION WITH POLICY TAGS
  // ============================================================================

  const session = neo4j.session();

  try {
    const investigationResult = await session.run(
      `
      MATCH (i:Investigation {id: $investigationId, tenantId: $tenantId})
      RETURN i {
        .*,
        policy_tags: {
          origin: i.policy_origin,
          sensitivity: i.policy_sensitivity,
          legal_basis: i.policy_legal_basis,
          purpose: i.policy_purpose,
          source_warrant: i.policy_source_warrant,
          data_classification: i.policy_data_classification,
          jurisdiction: i.policy_jurisdiction,
          collection_date: toString(i.policy_collection_date),
          expiry_date: toString(i.policy_expiry_date),
          pii_flags: i.policy_pii_flags
        }
      } as investigation
      `,
      {
        investigationId,
        tenantId: user.tenant,
      },
    );

    if (investigationResult.records.length === 0) {
      // Not found - log and deny
      await auditSystem.recordEvent({
        eventType: 'resource_access',
        level: 'warn',
        correlationId,
        sessionId,
        requestId,
        userId: user.id,
        tenantId: user.tenant,
        serviceId: 'intelgraph-api',
        resourceType: 'investigation',
        resourceId: investigationId,
        action: 'view_case_graph',
        outcome: 'failure',
        message: 'Investigation not found or access denied',
        details: {
          purpose: governance.purpose,
          legalBasis: governance.legalBasis,
          warrantId: governance.warrantId,
          reasonForAccess: governance.reasonForAccess,
          denyReason: 'not_found',
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        complianceRelevant: true,
        complianceFrameworks: ['SOX', 'SOC2'],
      });

      throw new ForbiddenError('Investigation not found or access denied');
    }

    const investigation = investigationResult.records[0].get('investigation');
    const policyTags = investigation.policy_tags;

    // ============================================================================
    // 4. WARRANT VALIDATION (if warrant provided)
    // ============================================================================

    if (governance.warrantId) {
      const warrantValidation = await warrantService.validateWarrant(
        governance.warrantId,
        {
          resourceType: 'investigation',
          resourceId: investigationId,
          operation: 'view',
          purpose: governance.purpose,
          sensitivity: policyTags.sensitivity,
          jurisdiction: policyTags.jurisdiction,
        },
      );

      if (!warrantValidation.valid) {
        // Warrant validation failed - log and deny
        await auditSystem.recordEvent({
          eventType: 'policy_violation',
          level: 'error',
          correlationId,
          sessionId,
          requestId,
          userId: user.id,
          tenantId: user.tenant,
          serviceId: 'intelgraph-api',
          resourceType: 'investigation',
          resourceId: investigationId,
          action: 'view_case_graph',
          outcome: 'failure',
          message: 'Warrant validation failed',
          details: {
            purpose: governance.purpose,
            legalBasis: governance.legalBasis,
            warrantId: governance.warrantId,
            reasonForAccess: governance.reasonForAccess,
            warrantValidation,
          },
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          complianceRelevant: true,
          complianceFrameworks: ['SOX', 'SOC2', 'GDPR'],
        });

        throw new ForbiddenError(
          `Warrant validation failed: ${warrantValidation.reason}. ` +
          `To request access, contact your compliance officer at compliance@example.com or ` +
          `submit an access request via /api/access-requests.`
        );
      }
    }

    // ============================================================================
    // 5. OPA AUTHORIZATION
    // ============================================================================

    const policyInput = {
      user: {
        id: user.id,
        tenant: user.tenant,
        roles: user.roles || [],
        scopes: user.scopes || [],
        clearance_levels: user.clearanceLevels || ['internal'],
        residency: user.residency || 'US',
      },
      resource: {
        type: 'investigation',
        id: investigationId,
        tenant: user.tenant,
        policy_sensitivity: policyTags.sensitivity,
        policy_legal_basis: policyTags.legal_basis,
        policy_purpose: policyTags.purpose,
        policy_data_classification: policyTags.data_classification,
        policy_jurisdiction: policyTags.jurisdiction,
        policy_pii_flags: policyTags.pii_flags,
      },
      context: {
        purpose: governance.purpose,
        legal_basis: governance.legalBasis,
        warrant_id: governance.warrantId,
        reason: governance.reasonForAccess,
        purposes: [governance.purpose],
      },
      operation_type: 'query',
    };

    const policyStartTime = Date.now();
    const opaResult = await opa.evaluate('intelgraph.abac', policyInput);
    const policyEvaluationTime = Date.now() - policyStartTime;

    const allowed = opaResult?.allow || false;
    const denyReasons = opaResult?.deny_reason || [];
    const redactedFields = opaResult?.redact_fields || [];

    if (!allowed) {
      // Access denied by policy - log with appeal information
      await auditSystem.recordEvent({
        eventType: 'policy_decision',
        level: 'warn',
        correlationId,
        sessionId,
        requestId,
        userId: user.id,
        tenantId: user.tenant,
        serviceId: 'intelgraph-api',
        resourceType: 'investigation',
        resourceId: investigationId,
        action: 'view_case_graph',
        outcome: 'failure',
        message: 'Access denied by authorization policy',
        details: {
          purpose: governance.purpose,
          legalBasis: governance.legalBasis,
          warrantId: governance.warrantId,
          reasonForAccess: governance.reasonForAccess,
          policyDecision: {
            allowed: false,
            denyReasons,
            appliedPolicies: ['intelgraph.abac.allow'],
            evaluationTimeMs: policyEvaluationTime,
          },
          resourcePolicyTags: policyTags,
          appealAvailable: true,
          appealContact: 'compliance@example.com',
          appealProcess: 'Submit access request via /api/access-requests',
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        complianceRelevant: true,
        complianceFrameworks: ['SOX', 'SOC2', 'GDPR'],
      });

      throw new ForbiddenError(
        `Access denied: ${denyReasons.join(', ')}.\n\n` +
        `You can appeal this decision by:\n` +
        `1. Contacting compliance@example.com\n` +
        `2. Submitting an access request at /api/access-requests\n` +
        `3. Obtaining the required warrant for this data classification\n\n` +
        `Request ID for reference: ${correlationId}`
      );
    }

    // ============================================================================
    // 6. RECORD WARRANT USAGE (if warrant used)
    // ============================================================================

    if (governance.warrantId) {
      await warrantService.recordWarrantUsage({
        warrantId: governance.warrantId,
        userId: user.id,
        tenantId: user.tenant,
        resourceType: 'investigation',
        resourceId: investigationId,
        operation: 'view',
        purpose: governance.purpose,
        reasonForAccess: governance.reasonForAccess,
        timestamp: new Date(),
        auditEventId: undefined, // Will be linked after audit event is created
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        sessionId,
        accessGranted: true,
      });
    }

    // ============================================================================
    // 7. FETCH CASE GRAPH WITH POLICY FILTERING
    // ============================================================================

    // Determine user's effective clearance level
    const userClearance = user.clearanceLevels?.[user.clearanceLevels.length - 1] || 'internal';
    const sensitivityOrder = ['public', 'internal', 'confidential', 'restricted', 'top_secret'];
    const maxSensitivityIndex = sensitivityOrder.indexOf(userClearance);

    const caseGraphResult = await session.run(
      `
      MATCH (i:Investigation {id: $investigationId, tenantId: $tenantId})
      OPTIONAL MATCH path = (i)-[r*0..${depth}]-(e)
      WHERE e.tenantId = $tenantId
      AND (
        e.policy_sensitivity IS NULL
        OR e.policy_sensitivity IN $allowedSensitivities
      )
      AND (
        e.policy_purpose IS NULL
        OR size(e.policy_purpose) = 0
        OR $purpose IN e.policy_purpose
      )
      AND (
        e.policy_expiry_date IS NULL
        OR e.policy_expiry_date > datetime()
      )
      WITH DISTINCT e, collect(DISTINCT r) as rels
      RETURN e {
        .*,
        policy_tags: {
          origin: e.policy_origin,
          sensitivity: e.policy_sensitivity,
          legal_basis: e.policy_legal_basis,
          purpose: e.policy_purpose,
          source_warrant: e.policy_source_warrant,
          data_classification: e.policy_data_classification,
          pii_flags: e.policy_pii_flags
        }
      } as entity,
      rels as relationships
      `,
      {
        investigationId,
        tenantId: user.tenant,
        allowedSensitivities: sensitivityOrder.slice(0, maxSensitivityIndex + 1),
        purpose: governance.purpose,
      },
    );

    const entities = caseGraphResult.records.map(r => r.get('entity'));
    const relationships = caseGraphResult.records
      .flatMap(r => r.get('relationships'))
      .filter(r => r !== null);

    // ============================================================================
    // 8. APPLY FIELD-LEVEL REDACTIONS
    // ============================================================================

    const redactedEntities = entities.map(entity => {
      if (!entity) return entity;

      const redacted = { ...entity };

      // Apply OPA-determined redactions
      redactedFields.forEach(field => {
        if (redacted[field]) {
          redacted[field] = '[REDACTED]';
        }
      });

      // Redact PII fields if user doesn't have PII scope
      if (!user.scopes?.includes('scope:pii') && entity.policy_tags?.pii_flags) {
        if (entity.policy_tags.pii_flags.has_emails && redacted.email) {
          redacted.email = '[REDACTED]';
        }
        if (entity.policy_tags.pii_flags.has_phones && redacted.phone) {
          redacted.phone = '[REDACTED]';
        }
        if (entity.policy_tags.pii_flags.has_ssn && redacted.ssn) {
          redacted.ssn = '[REDACTED]';
        }
        if (entity.policy_tags.pii_flags.has_addresses && redacted.address) {
          redacted.address = '[REDACTED]';
        }
      }

      return redacted;
    });

    // ============================================================================
    // 9. SUCCESS AUDIT LOG
    // ============================================================================

    const auditEventId = await auditSystem.recordEvent({
      eventType: 'resource_access',
      level: 'info',
      correlationId,
      sessionId,
      requestId,
      userId: user.id,
      tenantId: user.tenant,
      serviceId: 'intelgraph-api',
      resourceType: 'investigation',
      resourceId: investigationId,
      action: 'view_case_graph',
      outcome: 'success',
      message: 'Case graph accessed successfully',
      details: {
        purpose: governance.purpose,
        legalBasis: governance.legalBasis,
        warrantId: governance.warrantId,
        warrantNumber: warrant?.warrantNumber,
        reasonForAccess: governance.reasonForAccess,
        policyDecision: {
          allowed: true,
          denyReasons: [],
          redactedFields,
          appliedPolicies: ['intelgraph.abac.allow'],
          evaluationTimeMs: policyEvaluationTime,
        },
        resourcePolicyTags: policyTags,
        entityCount: entities.length,
        relationshipCount: relationships.length,
        graphDepth: depth,
        totalExecutionTimeMs: Date.now() - startTime,
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      complianceRelevant: true,
      complianceFrameworks: ['SOX', 'SOC2', 'GDPR'],
      dataClassification: policyTags.data_classification,
    });

    // ============================================================================
    // 10. RETURN RESULTS WITH GOVERNANCE METADATA
    // ============================================================================

    logger.info({
      investigationId,
      userId: user.id,
      tenantId: user.tenant,
      purpose: governance.purpose,
      warrantId: governance.warrantId,
      entityCount: entities.length,
      relationshipCount: relationships.length,
      executionTimeMs: Date.now() - startTime,
    }, 'Case graph accessed successfully');

    return {
      investigation,
      entities: redactedEntities,
      relationships,
      governanceMetadata: {
        policyTags,
        warrantId: governance.warrantId,
        warrantNumber: warrant?.warrantNumber,
        purpose: governance.purpose,
        legalBasis: governance.legalBasis,
        reasonForAccess: governance.reasonForAccess,
        redactedFields,
        accessGrantedAt: new Date().toISOString(),
        auditTrailId: correlationId,
        policyEvaluationTimeMs: policyEvaluationTime,
      },
    };
  } catch (error) {
    // Log error for debugging
    logger.error({
      error: error.message,
      stack: error.stack,
      investigationId,
      userId: user.id,
      tenantId: user.tenant,
      governance,
    }, 'Failed to fetch investigation case graph');

    // If it's already an Apollo error, rethrow
    if (error instanceof AuthenticationError || error instanceof ForbiddenError) {
      throw error;
    }

    // Log unexpected error to audit system
    await auditSystem.recordEvent({
      eventType: 'system_error',
      level: 'error',
      correlationId,
      sessionId,
      requestId,
      userId: user?.id,
      tenantId: user?.tenant || 'unknown',
      serviceId: 'intelgraph-api',
      resourceType: 'investigation',
      resourceId: investigationId,
      action: 'view_case_graph',
      outcome: 'failure',
      message: 'Unexpected error accessing case graph',
      details: {
        error: error.message,
        stack: error.stack,
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      complianceRelevant: true,
      complianceFrameworks: ['SOX', 'SOC2'],
    });

    throw new Error('An unexpected error occurred. Please contact support with request ID: ' + correlationId);
  } finally {
    await session.close();
  }
}

/**
 * Export resolvers
 */
export const governedInvestigationResolvers = {
  Query: {
    investigationCaseGraph: getInvestigationCaseGraph,
  },
};
