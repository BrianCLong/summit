/**
 * Cognitive Security Governance Service
 *
 * Provides governance framework for cognitive security operations:
 * - Transparent policies and rules
 * - Appeal workflows for verification decisions
 * - Comprehensive audit logging
 * - Separation between verification and policy action
 * - Access control and privacy boundaries
 *
 * Designed to survive scrutiny and free-speech blowback.
 */

import { randomUUID, createHash } from 'crypto';
import pino from 'pino';
import type { Driver, Session } from 'neo4j-driver';

import type {
  CogSecAuditLog,
  VerificationAppeal,
  GovernancePolicy,
  AppealStatus,
  ClaimVerdict,
} from './types.js';

const logger = (pino as any)({ name: 'cogsec-governance-service' });

// ============================================================================
// Configuration
// ============================================================================

export interface GovernanceServiceConfig {
  /** Neo4j driver */
  neo4jDriver: Driver;
  /** PostgreSQL pool for audit logs (immutable storage) */
  pgPool?: any;
  /** Enable WORM mode for audit logs */
  wormEnabled?: boolean;
  /** Appeal review SLA (hours) */
  appealReviewSlaHours?: number;
  /** Default policy version */
  defaultPolicyVersion?: number;
}

// ============================================================================
// Governance Policies
// ============================================================================

/**
 * Default governance policies
 */
export const DEFAULT_POLICIES: Omit<GovernancePolicy, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>[] = [
  {
    name: 'Verification Standards',
    description: 'Standards for claim verification and verdict assignment',
    type: 'VERIFICATION',
    rules: {
      minEvidenceForVerified: 2,
      minConfidenceForVerified: 0.8,
      minEvidenceForRefuted: 2,
      minConfidenceForRefuted: 0.8,
      requireHumanReviewAboveConfidence: 0.95,
      requireHumanReviewBelowConfidence: 0.3,
      allowAutomatedVerdict: true,
      automatedVerdictThreshold: 0.9,
    },
    isActive: true,
    version: 1,
  },
  {
    name: 'Action Authorization',
    description: 'Rules for authorizing response actions',
    type: 'ACTION',
    rules: {
      requireApprovalForTakedown: true,
      approvalLevels: {
        TAKEDOWN_PACKET: ['senior_analyst', 'manager'],
        ESCALATION: ['analyst', 'senior_analyst'],
        BRIEFING: ['analyst'],
        STAKEHOLDER_MESSAGE: ['senior_analyst'],
      },
      maxAutoActionsPerHour: 10,
      requireJustification: true,
      minJustificationLength: 50,
    },
    isActive: true,
    version: 1,
  },
  {
    name: 'Escalation Rules',
    description: 'When and how to escalate incidents',
    type: 'ESCALATION',
    rules: {
      autoEscalateOnThreatLevel: ['CRITICAL'],
      escalationTimeframes: {
        CRITICAL: 1, // hours
        HIGH: 4,
        MEDIUM: 24,
        LOW: 72,
      },
      notifyOnEscalation: true,
      escalationChain: ['team_lead', 'manager', 'director'],
    },
    isActive: true,
    version: 1,
  },
  {
    name: 'Data Retention',
    description: 'Data retention and deletion policies',
    type: 'RETENTION',
    rules: {
      claimRetentionDays: 365,
      evidenceRetentionDays: 730,
      auditLogRetentionDays: 2555, // 7 years
      deleteOnRequest: false,
      anonymizeAfterDays: 180,
      exportFormats: ['json', 'csv'],
    },
    isActive: true,
    version: 1,
  },
  {
    name: 'Access Control',
    description: 'Role-based access control for CogSec operations',
    type: 'ACCESS',
    rules: {
      roles: {
        viewer: {
          canView: ['claims', 'narratives', 'campaigns'],
          canEdit: [],
          canDelete: [],
        },
        analyst: {
          canView: ['claims', 'narratives', 'campaigns', 'actors', 'channels'],
          canEdit: ['claims', 'narratives'],
          canDelete: [],
          canVerify: true,
        },
        senior_analyst: {
          canView: ['*'],
          canEdit: ['claims', 'narratives', 'campaigns', 'playbooks'],
          canDelete: ['drafts'],
          canVerify: true,
          canApprove: true,
        },
        manager: {
          canView: ['*'],
          canEdit: ['*'],
          canDelete: ['*'],
          canVerify: true,
          canApprove: true,
          canConfigurePolicy: true,
        },
      },
      requireMFA: ['manager'],
      sessionTimeout: 3600,
    },
    isActive: true,
    version: 1,
  },
];

// ============================================================================
// Governance Service
// ============================================================================

export class GovernanceService {
  private readonly config: GovernanceServiceConfig;
  private policies = new Map<string, GovernancePolicy>();

  constructor(config: GovernanceServiceConfig) {
    this.config = {
      wormEnabled: true,
      appealReviewSlaHours: 48,
      defaultPolicyVersion: 1,
      ...config,
    };

    // Load default policies
    this.loadDefaultPolicies();

    logger.info('Governance service initialized');
  }

  private getSession(): Session {
    return this.config.neo4jDriver.session();
  }

  private loadDefaultPolicies(): void {
    for (const policy of DEFAULT_POLICIES) {
      const fullPolicy: GovernancePolicy = {
        ...policy,
        id: randomUUID(),
        createdBy: 'system',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.policies.set(policy.type, fullPolicy);
    }
  }

  // ==========================================================================
  // Audit Logging
  // ==========================================================================

  /**
   * Log an audit event (immutable)
   */
  async logAudit(
    action: string,
    resourceType: CogSecAuditLog['resourceType'],
    resourceId: string,
    userId: string,
    options?: {
      tenantId?: string;
      previousState?: Record<string, unknown>;
      newState?: Record<string, unknown>;
      justification?: string;
      ipAddress?: string;
      userAgent?: string;
    },
  ): Promise<CogSecAuditLog> {
    const auditLog: CogSecAuditLog = {
      id: randomUUID(),
      action,
      resourceType,
      resourceId,
      userId,
      tenantId: options?.tenantId,
      previousState: options?.previousState,
      newState: options?.newState,
      justification: options?.justification,
      timestamp: new Date().toISOString(),
      ipAddress: options?.ipAddress,
      userAgent: options?.userAgent,
    };

    // Store in PostgreSQL if available (immutable/WORM storage)
    if (this.config.pgPool) {
      await this.persistAuditLogToPg(auditLog);
    }

    // Also store in Neo4j for graph queries
    await this.persistAuditLogToNeo4j(auditLog);

    logger.info(
      {
        auditId: auditLog.id,
        action,
        resourceType,
        resourceId,
        userId,
      },
      'Audit log created',
    );

    return auditLog;
  }

  /**
   * Persist audit log to PostgreSQL (WORM mode)
   */
  private async persistAuditLogToPg(log: CogSecAuditLog): Promise<void> {
    if (!this.config.pgPool) return;

    const client = await this.config.pgPool.connect();
    try {
      // Calculate hash for integrity verification
      const logHash = this.calculateLogHash(log);

      await client.query(
        `
        INSERT INTO cogsec_audit_logs (
          id, action, resource_type, resource_id, user_id, tenant_id,
          previous_state, new_state, justification, timestamp,
          ip_address, user_agent, log_hash
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        `,
        [
          log.id,
          log.action,
          log.resourceType,
          log.resourceId,
          log.userId,
          log.tenantId,
          JSON.stringify(log.previousState),
          JSON.stringify(log.newState),
          log.justification,
          log.timestamp,
          log.ipAddress,
          log.userAgent,
          logHash,
        ],
      );
    } finally {
      client.release();
    }
  }

  /**
   * Persist audit log to Neo4j
   */
  private async persistAuditLogToNeo4j(log: CogSecAuditLog): Promise<void> {
    const session = this.getSession();
    try {
      await session.run(
        `
        CREATE (a:CogSecAuditLog {
          id: $id,
          action: $action,
          resourceType: $resourceType,
          resourceId: $resourceId,
          userId: $userId,
          tenantId: $tenantId,
          previousState: $previousState,
          newState: $newState,
          justification: $justification,
          timestamp: datetime($timestamp),
          ipAddress: $ipAddress,
          userAgent: $userAgent
        })
        WITH a
        OPTIONAL MATCH (r {id: $resourceId})
        FOREACH (ignore IN CASE WHEN r IS NOT NULL THEN [1] ELSE [] END |
          MERGE (a)-[:AUDITS]->(r)
        )
        `,
        {
          ...log,
          previousState: JSON.stringify(log.previousState),
          newState: JSON.stringify(log.newState),
        },
      );
    } finally {
      await session.close();
    }
  }

  /**
   * Calculate hash for audit log integrity
   */
  private calculateLogHash(log: CogSecAuditLog): string {
    const data = JSON.stringify({
      id: log.id,
      action: log.action,
      resourceType: log.resourceType,
      resourceId: log.resourceId,
      userId: log.userId,
      timestamp: log.timestamp,
    });
    return createHash('sha256').update(data).digest('hex');
  }

  /**
   * Query audit logs
   */
  async queryAuditLogs(
    filters: {
      resourceType?: CogSecAuditLog['resourceType'];
      resourceId?: string;
      userId?: string;
      action?: string;
      startDate?: string;
      endDate?: string;
    },
    limit = 100,
    offset = 0,
  ): Promise<CogSecAuditLog[]> {
    const session = this.getSession();
    try {
      let cypher = 'MATCH (a:CogSecAuditLog) WHERE 1=1';
      const params: Record<string, unknown> = { limit, offset };

      if (filters.resourceType) {
        cypher += ' AND a.resourceType = $resourceType';
        params.resourceType = filters.resourceType;
      }

      if (filters.resourceId) {
        cypher += ' AND a.resourceId = $resourceId';
        params.resourceId = filters.resourceId;
      }

      if (filters.userId) {
        cypher += ' AND a.userId = $userId';
        params.userId = filters.userId;
      }

      if (filters.action) {
        cypher += ' AND a.action = $action';
        params.action = filters.action;
      }

      if (filters.startDate) {
        cypher += ' AND a.timestamp >= datetime($startDate)';
        params.startDate = filters.startDate;
      }

      if (filters.endDate) {
        cypher += ' AND a.timestamp <= datetime($endDate)';
        params.endDate = filters.endDate;
      }

      cypher += ' RETURN a ORDER BY a.timestamp DESC SKIP $offset LIMIT $limit';

      const result = await session.run(cypher, params);
      return result.records.map((r: any) => this.recordToAuditLog(r.get('a')));
    } finally {
      await session.close();
    }
  }

  /**
   * Get audit trail for a resource
   */
  async getResourceAuditTrail(
    resourceType: CogSecAuditLog['resourceType'],
    resourceId: string,
  ): Promise<CogSecAuditLog[]> {
    return this.queryAuditLogs({ resourceType, resourceId });
  }

  // ==========================================================================
  // Appeal Workflows
  // ==========================================================================

  /**
   * Create an appeal for a claim verdict
   */
  async createAppeal(
    claimId: string,
    currentVerdict: ClaimVerdict,
    requestedVerdict: ClaimVerdict,
    appellantId: string,
    reason: string,
    supportingEvidence: string[] = [],
  ): Promise<VerificationAppeal> {
    const appeal: VerificationAppeal = {
      id: randomUUID(),
      claimId,
      currentVerdict,
      requestedVerdict,
      appellantId,
      reason,
      supportingEvidence,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };

    // Validate appeal
    const validation = this.validateAppeal(appeal);
    if (!validation.valid) {
      throw new Error(`Invalid appeal: ${validation.reason}`);
    }

    // Persist appeal
    await this.persistAppeal(appeal);

    // Create audit log
    await this.logAudit('CREATE_APPEAL', 'CLAIM', claimId, appellantId, {
      newState: { appealId: appeal.id, requestedVerdict },
      justification: reason,
    });

    logger.info(
      { appealId: appeal.id, claimId, appellantId },
      'Created verification appeal',
    );

    return appeal;
  }

  /**
   * Validate appeal request
   */
  private validateAppeal(appeal: VerificationAppeal): { valid: boolean; reason?: string } {
    if (appeal.reason.length < 20) {
      return { valid: false, reason: 'Reason must be at least 20 characters' };
    }

    if (appeal.currentVerdict === appeal.requestedVerdict) {
      return { valid: false, reason: 'Requested verdict same as current' };
    }

    if (appeal.currentVerdict === 'UNVERIFIED' && appeal.requestedVerdict === 'DISPUTED') {
      return { valid: false, reason: 'Cannot appeal unverified claim to disputed' };
    }

    return { valid: true };
  }

  /**
   * Review an appeal
   */
  async reviewAppeal(
    appealId: string,
    reviewerId: string,
    decision: 'APPROVED' | 'DENIED' | 'ESCALATED',
    notes: string,
  ): Promise<VerificationAppeal> {
    // Check reviewer authorization
    const authorized = await this.checkReviewerAuthorization(reviewerId);
    if (!authorized) {
      throw new Error('Reviewer not authorized to review appeals');
    }

    const session = this.getSession();
    try {
      const statusMap: Record<string, AppealStatus> = {
        APPROVED: 'APPROVED',
        DENIED: 'DENIED',
        ESCALATED: 'ESCALATED',
      };

      const result = await session.run(
        `
        MATCH (a:CogSecAppeal {id: $appealId})
        SET a.status = $status,
            a.reviewerId = $reviewerId,
            a.reviewNotes = $notes,
            a.resolvedAt = datetime()
        RETURN a
        `,
        {
          appealId,
          status: statusMap[decision],
          reviewerId,
          notes,
        },
      );

      if (result.records.length === 0) {
        throw new Error(`Appeal not found: ${appealId}`);
      }

      const appeal = this.recordToAppeal(result.records[0].get('a'));

      // If approved, update the claim verdict
      if (decision === 'APPROVED') {
        await this.applyAppealDecision(appeal);
      }

      // Create audit log
      await this.logAudit('REVIEW_APPEAL', 'CLAIM', appeal.claimId, reviewerId, {
        previousState: { status: 'PENDING' },
        newState: { status: statusMap[decision], resolution: decision },
        justification: notes,
      });

      logger.info(
        { appealId, decision, reviewerId },
        'Reviewed verification appeal',
      );

      return appeal;
    } finally {
      await session.close();
    }
  }

  /**
   * Apply approved appeal decision to claim
   */
  private async applyAppealDecision(appeal: VerificationAppeal): Promise<void> {
    const session = this.getSession();
    try {
      await session.run(
        `
        MATCH (c:CogSecClaim {id: $claimId})
        SET c.verdict = $requestedVerdict,
            c.verdictConfidence = 0.5,
            c.updatedAt = datetime()
        `,
        {
          claimId: appeal.claimId,
          requestedVerdict: appeal.requestedVerdict,
        },
      );
    } finally {
      await session.close();
    }
  }

  /**
   * Check if user is authorized to review appeals
   */
  private async checkReviewerAuthorization(userId: string): Promise<boolean> {
    const accessPolicy = this.policies.get('ACCESS');
    if (!accessPolicy) return false;

    // In production, would check user's role against policy
    // For now, allow any authenticated user
    return true;
  }

  /**
   * Get pending appeals
   */
  async getPendingAppeals(limit = 50): Promise<VerificationAppeal[]> {
    const session = this.getSession();
    try {
      const result = await session.run(
        `
        MATCH (a:CogSecAppeal {status: 'PENDING'})
        RETURN a
        ORDER BY a.createdAt ASC
        LIMIT $limit
        `,
        { limit },
      );

      return result.records.map((r: any) => this.recordToAppeal(r.get('a')));
    } finally {
      await session.close();
    }
  }

  /**
   * Get appeal by ID
   */
  async getAppeal(appealId: string): Promise<VerificationAppeal | null> {
    const session = this.getSession();
    try {
      const result = await session.run(
        'MATCH (a:CogSecAppeal {id: $appealId}) RETURN a',
        { appealId },
      );

      if (result.records.length === 0) return null;
      return this.recordToAppeal(result.records[0].get('a'));
    } finally {
      await session.close();
    }
  }

  /**
   * Get appeals for a user
   */
  async getUserAppeals(userId: string): Promise<VerificationAppeal[]> {
    const session = this.getSession();
    try {
      const result = await session.run(
        `
        MATCH (a:CogSecAppeal {appellantId: $userId})
        RETURN a
        ORDER BY a.createdAt DESC
        `,
        { userId },
      );

      return result.records.map((r: any) => this.recordToAppeal(r.get('a')));
    } finally {
      await session.close();
    }
  }

  // ==========================================================================
  // Policy Management
  // ==========================================================================

  /**
   * Get active policy by type
   */
  getPolicy(type: GovernancePolicy['type']): GovernancePolicy | undefined {
    return this.policies.get(type);
  }

  /**
   * Get all active policies
   */
  getAllPolicies(): GovernancePolicy[] {
    return Array.from(this.policies.values());
  }

  /**
   * Update a policy
   */
  async updatePolicy(
    type: GovernancePolicy['type'],
    updates: Partial<Pick<GovernancePolicy, 'rules' | 'description' | 'isActive'>>,
    updatedBy: string,
  ): Promise<GovernancePolicy> {
    const current = this.policies.get(type);
    if (!current) {
      throw new Error(`Policy not found: ${type}`);
    }

    const updated: GovernancePolicy = {
      ...current,
      ...updates,
      version: current.version + 1,
      updatedAt: new Date().toISOString(),
    };

    this.policies.set(type, updated);

    // Log the policy change
    await this.logAudit('UPDATE_POLICY', 'CLAIM', current.id, updatedBy, {
      previousState: { version: current.version, rules: current.rules },
      newState: { version: updated.version, rules: updated.rules },
      justification: 'Policy update',
    });

    logger.info(
      { policyType: type, version: updated.version },
      'Updated governance policy',
    );

    return updated;
  }

  /**
   * Check if action is allowed by policy
   */
  checkActionAllowed(
    actionType: string,
    userRole: string,
    resourceType: string,
  ): { allowed: boolean; requiresApproval: boolean; approvers?: string[] } {
    const actionPolicy = this.policies.get('ACTION');
    const accessPolicy = this.policies.get('ACCESS');

    if (!actionPolicy || !accessPolicy) {
      return { allowed: false, requiresApproval: false };
    }

    const rolePermissions = (accessPolicy.rules as any).roles?.[userRole];
    if (!rolePermissions) {
      return { allowed: false, requiresApproval: false };
    }

    // Check if role can perform action
    const canEdit =
      rolePermissions.canEdit?.includes('*') ||
      rolePermissions.canEdit?.includes(resourceType.toLowerCase());

    if (!canEdit) {
      return { allowed: false, requiresApproval: false };
    }

    // Check if action requires approval
    const approvalLevels = (actionPolicy.rules as any).approvalLevels?.[actionType];
    const requiresApproval =
      (actionPolicy.rules as any).requireApprovalForTakedown &&
      actionType === 'TAKEDOWN_PACKET';

    return {
      allowed: true,
      requiresApproval,
      approvers: approvalLevels,
    };
  }

  // ==========================================================================
  // Separation of Concerns
  // ==========================================================================

  /**
   * Generate verification decision (separate from policy action)
   */
  async generateVerificationDecision(
    claimId: string,
    evidence: Array<{ id: string; supports: boolean; confidence: number }>,
  ): Promise<{
    recommendedVerdict: ClaimVerdict;
    confidence: number;
    requiresHumanReview: boolean;
    reasoning: string;
  }> {
    const policy = this.policies.get('VERIFICATION');
    if (!policy) {
      throw new Error('Verification policy not found');
    }

    const rules = policy.rules as any;

    // Calculate supporting vs refuting evidence
    const supporting = evidence.filter((e) => e.supports);
    const refuting = evidence.filter((e) => !e.supports);

    const supportingConfidence =
      supporting.reduce((sum, e) => sum + e.confidence, 0) / Math.max(1, supporting.length);
    const refutingConfidence =
      refuting.reduce((sum, e) => sum + e.confidence, 0) / Math.max(1, refuting.length);

    let recommendedVerdict: ClaimVerdict = 'UNVERIFIED';
    let confidence = 0;
    let reasoning = '';

    if (
      supporting.length >= rules.minEvidenceForVerified &&
      supportingConfidence >= rules.minConfidenceForVerified &&
      refuting.length === 0
    ) {
      recommendedVerdict = 'VERIFIED';
      confidence = supportingConfidence;
      reasoning = `${supporting.length} pieces of supporting evidence with avg confidence ${Math.round(supportingConfidence * 100)}%`;
    } else if (
      refuting.length >= rules.minEvidenceForRefuted &&
      refutingConfidence >= rules.minConfidenceForRefuted &&
      supporting.length === 0
    ) {
      recommendedVerdict = 'REFUTED';
      confidence = refutingConfidence;
      reasoning = `${refuting.length} pieces of refuting evidence with avg confidence ${Math.round(refutingConfidence * 100)}%`;
    } else if (supporting.length > 0 && refuting.length > 0) {
      recommendedVerdict = 'DISPUTED';
      confidence = Math.max(supportingConfidence, refutingConfidence);
      reasoning = `Conflicting evidence: ${supporting.length} supporting, ${refuting.length} refuting`;
    } else if (supporting.length > 0 || refuting.length > 0) {
      recommendedVerdict = 'INCONCLUSIVE';
      confidence = Math.max(supportingConfidence, refutingConfidence) * 0.5;
      reasoning = 'Insufficient evidence for definitive verdict';
    }

    // Check if human review required
    const requiresHumanReview =
      confidence >= rules.requireHumanReviewAboveConfidence ||
      confidence <= rules.requireHumanReviewBelowConfidence;

    return {
      recommendedVerdict,
      confidence,
      requiresHumanReview,
      reasoning,
    };
  }

  /**
   * Propose policy action (separate from verification)
   */
  async proposePolicyAction(
    campaignId: string,
    proposedActions: string[],
    proposerId: string,
    justification: string,
  ): Promise<{
    proposalId: string;
    status: 'PENDING_APPROVAL' | 'AUTO_APPROVED' | 'REJECTED';
    requiredApprovers?: string[];
    reasoning: string;
  }> {
    const policy = this.policies.get('ACTION');
    if (!policy) {
      throw new Error('Action policy not found');
    }

    const proposalId = randomUUID();
    const rules = policy.rules as any;

    // Check justification length
    if (rules.requireJustification && justification.length < rules.minJustificationLength) {
      return {
        proposalId,
        status: 'REJECTED',
        reasoning: `Justification must be at least ${rules.minJustificationLength} characters`,
      };
    }

    // Check if any actions require approval
    const actionsRequiringApproval = proposedActions.filter(
      (action) => rules.approvalLevels?.[action],
    );

    if (actionsRequiringApproval.length === 0) {
      // Auto-approve if no actions require approval
      await this.logAudit('PROPOSE_ACTION', 'CAMPAIGN', campaignId, proposerId, {
        newState: { proposalId, actions: proposedActions, status: 'AUTO_APPROVED' },
        justification,
      });

      return {
        proposalId,
        status: 'AUTO_APPROVED',
        reasoning: 'No approval required for proposed actions',
      };
    }

    // Get required approvers
    const requiredApprovers = new Set<string>();
    for (const action of actionsRequiringApproval) {
      const approvers = rules.approvalLevels[action] || [];
      approvers.forEach((a: string) => requiredApprovers.add(a));
    }

    await this.logAudit('PROPOSE_ACTION', 'CAMPAIGN', campaignId, proposerId, {
      newState: {
        proposalId,
        actions: proposedActions,
        status: 'PENDING_APPROVAL',
        requiredApprovers: Array.from(requiredApprovers),
      },
      justification,
    });

    return {
      proposalId,
      status: 'PENDING_APPROVAL',
      requiredApprovers: Array.from(requiredApprovers),
      reasoning: `Actions ${actionsRequiringApproval.join(', ')} require approval`,
    };
  }

  // ==========================================================================
  // Transparency Reports
  // ==========================================================================

  /**
   * Generate transparency report
   */
  async generateTransparencyReport(
    startDate: string,
    endDate: string,
  ): Promise<{
    period: { start: string; end: string };
    claims: {
      total: number;
      verified: number;
      refuted: number;
      disputed: number;
      unverified: number;
    };
    appeals: {
      total: number;
      approved: number;
      denied: number;
      pending: number;
    };
    actions: {
      takedownsRequested: number;
      takedownsExecuted: number;
      briefingsGenerated: number;
    };
    policies: {
      version: number;
      lastUpdated: string;
    };
  }> {
    const session = this.getSession();
    try {
      // Get claim statistics
      const claimResult = await session.run(
        `
        MATCH (c:CogSecClaim)
        WHERE c.createdAt >= datetime($startDate) AND c.createdAt <= datetime($endDate)
        RETURN
          count(c) AS total,
          count(CASE WHEN c.verdict = 'VERIFIED' THEN 1 END) AS verified,
          count(CASE WHEN c.verdict = 'REFUTED' THEN 1 END) AS refuted,
          count(CASE WHEN c.verdict = 'DISPUTED' THEN 1 END) AS disputed,
          count(CASE WHEN c.verdict = 'UNVERIFIED' THEN 1 END) AS unverified
        `,
        { startDate, endDate },
      );

      // Get appeal statistics
      const appealResult = await session.run(
        `
        MATCH (a:CogSecAppeal)
        WHERE a.createdAt >= datetime($startDate) AND a.createdAt <= datetime($endDate)
        RETURN
          count(a) AS total,
          count(CASE WHEN a.status = 'APPROVED' THEN 1 END) AS approved,
          count(CASE WHEN a.status = 'DENIED' THEN 1 END) AS denied,
          count(CASE WHEN a.status = 'PENDING' THEN 1 END) AS pending
        `,
        { startDate, endDate },
      );

      // Get action statistics
      const actionResult = await session.run(
        `
        MATCH (art:CogSecArtifact)
        WHERE art.generatedAt >= datetime($startDate) AND art.generatedAt <= datetime($endDate)
        RETURN
          count(CASE WHEN art.type = 'TAKEDOWN_PACKET' THEN 1 END) AS takedowns,
          count(CASE WHEN art.type = 'BRIEFING' THEN 1 END) AS briefings
        `,
        { startDate, endDate },
      );

      const claimData = claimResult.records[0];
      const appealData = appealResult.records[0];
      const actionData = actionResult.records[0];

      // Get current policy version
      const verificationPolicy = this.policies.get('VERIFICATION');

      return {
        period: { start: startDate, end: endDate },
        claims: {
          total: claimData?.get('total')?.toNumber() || 0,
          verified: claimData?.get('verified')?.toNumber() || 0,
          refuted: claimData?.get('refuted')?.toNumber() || 0,
          disputed: claimData?.get('disputed')?.toNumber() || 0,
          unverified: claimData?.get('unverified')?.toNumber() || 0,
        },
        appeals: {
          total: appealData?.get('total')?.toNumber() || 0,
          approved: appealData?.get('approved')?.toNumber() || 0,
          denied: appealData?.get('denied')?.toNumber() || 0,
          pending: appealData?.get('pending')?.toNumber() || 0,
        },
        actions: {
          takedownsRequested: actionData?.get('takedowns')?.toNumber() || 0,
          takedownsExecuted: 0, // Would need separate tracking
          briefingsGenerated: actionData?.get('briefings')?.toNumber() || 0,
        },
        policies: {
          version: verificationPolicy?.version || 1,
          lastUpdated: verificationPolicy?.updatedAt || startDate,
        },
      };
    } finally {
      await session.close();
    }
  }

  // ==========================================================================
  // Persistence Helpers
  // ==========================================================================

  private async persistAppeal(appeal: VerificationAppeal): Promise<void> {
    const session = this.getSession();
    try {
      await session.run(
        `
        CREATE (a:CogSecAppeal {
          id: $id,
          claimId: $claimId,
          currentVerdict: $currentVerdict,
          requestedVerdict: $requestedVerdict,
          appellantId: $appellantId,
          reason: $reason,
          supportingEvidence: $supportingEvidence,
          status: $status,
          createdAt: datetime($createdAt)
        })
        WITH a
        MATCH (c:CogSecClaim {id: $claimId})
        MERGE (a)-[:APPEALS]->(c)
        `,
        appeal,
      );
    } finally {
      await session.close();
    }
  }

  private recordToAuditLog(node: any): CogSecAuditLog {
    const props = node.properties || node;
    return {
      id: props.id,
      action: props.action,
      resourceType: props.resourceType,
      resourceId: props.resourceId,
      userId: props.userId,
      tenantId: props.tenantId,
      previousState:
        typeof props.previousState === 'string'
          ? JSON.parse(props.previousState)
          : props.previousState,
      newState:
        typeof props.newState === 'string'
          ? JSON.parse(props.newState)
          : props.newState,
      justification: props.justification,
      timestamp: props.timestamp?.toString() || props.timestamp,
      ipAddress: props.ipAddress,
      userAgent: props.userAgent,
    };
  }

  private recordToAppeal(node: any): VerificationAppeal {
    const props = node.properties || node;
    return {
      id: props.id,
      claimId: props.claimId,
      currentVerdict: props.currentVerdict,
      requestedVerdict: props.requestedVerdict,
      appellantId: props.appellantId,
      reason: props.reason,
      supportingEvidence: props.supportingEvidence || [],
      status: props.status,
      reviewerId: props.reviewerId,
      reviewNotes: props.reviewNotes,
      resolution: props.resolution,
      createdAt: props.createdAt?.toString() || props.createdAt,
      resolvedAt: props.resolvedAt?.toString(),
    };
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ healthy: boolean; details: Record<string, unknown> }> {
    const session = this.getSession();
    try {
      await session.run('RETURN 1');
      return {
        healthy: true,
        details: {
          neo4jConnected: true,
          policiesLoaded: this.policies.size,
          wormEnabled: this.config.wormEnabled,
          appealSlaHours: this.config.appealReviewSlaHours,
        },
      };
    } catch (error: any) {
      return {
        healthy: false,
        details: {
          neo4jConnected: false,
          error: error instanceof Error ? error.message : 'Unknown',
        },
      };
    } finally {
      await session.close();
    }
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

let serviceInstance: GovernanceService | null = null;

export function createGovernanceService(
  config: GovernanceServiceConfig,
): GovernanceService {
  return new GovernanceService(config);
}

export function initializeGovernanceService(
  config: GovernanceServiceConfig,
): GovernanceService {
  serviceInstance = new GovernanceService(config);
  return serviceInstance;
}

export function getGovernanceService(): GovernanceService {
  if (!serviceInstance) {
    throw new Error('Governance service not initialized');
  }
  return serviceInstance;
}
