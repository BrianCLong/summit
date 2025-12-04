/**
 * GovernanceEngine - Policy and Ethics Layer for Cognition
 *
 * Implements governance capabilities:
 * - OPA policy integration for decision authorization
 * - Hard constraints (safety, regulatory)
 * - Soft constraints (corporate ESG policies, risk appetite)
 * - Auditable decision logs
 * - Override tracking and approval workflows
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import pino from 'pino';
import type {
  Decision,
  ProposedAction,
  GovernancePolicy,
  PolicyRule,
  ComplianceCheck,
  Violation,
  AuditEntry,
  RiskLevel,
  Constraint,
} from '../types/index.js';

const logger = pino({ name: 'GovernanceEngine' });

export interface GovernanceConfig {
  opaEndpoint: string;
  strictMode: boolean;
  auditAll: boolean;
  requireApprovalForRisk: RiskLevel[];
  maxOverridesPerHour: number;
}

export interface PolicyEvaluationResult {
  allowed: boolean;
  requiresApproval: boolean;
  violations: Violation[];
  appliedPolicies: string[];
  confidence: number;
  rationale: string;
}

export interface AuditLog {
  entries: AuditEntry[];
  totalCount: number;
  violationCount: number;
  overrideCount: number;
}

export class GovernanceEngine extends EventEmitter {
  private config: GovernanceConfig;
  private policies: Map<string, GovernancePolicy> = new Map();
  private auditLog: AuditEntry[] = [];
  private overrideHistory: Map<string, Date[]> = new Map();

  constructor(config: Partial<GovernanceConfig> = {}) {
    super();
    this.config = {
      opaEndpoint: config.opaEndpoint ?? 'http://localhost:8181',
      strictMode: config.strictMode ?? true,
      auditAll: config.auditAll ?? true,
      requireApprovalForRisk: config.requireApprovalForRisk ?? ['HIGH', 'CRITICAL'],
      maxOverridesPerHour: config.maxOverridesPerHour ?? 5,
    };

    this.initializeDefaultPolicies();
  }

  private initializeDefaultPolicies(): void {
    // Safety policy
    this.registerPolicy({
      id: 'safety-policy',
      name: 'Safety Constraints',
      type: 'SAFETY',
      rules: [
        {
          id: 'safety-1',
          condition: 'action.riskLevel == "CRITICAL"',
          action: 'REQUIRE_APPROVAL',
          severity: 'CRITICAL',
          message: 'Critical risk actions require approval',
        },
        {
          id: 'safety-2',
          condition: 'action.type == "SAFETY_INTERVENTION"',
          action: 'LOG',
          severity: 'HIGH',
          message: 'Safety interventions must be logged',
        },
      ],
      priority: 100,
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Operational policy
    this.registerPolicy({
      id: 'operational-policy',
      name: 'Operational Constraints',
      type: 'OPERATIONAL',
      rules: [
        {
          id: 'op-1',
          condition: 'action.type == "ADJUST_SETPOINT" && abs(action.delta) > 0.2',
          action: 'REQUIRE_APPROVAL',
          severity: 'MEDIUM',
          message: 'Large setpoint changes require approval',
        },
        {
          id: 'op-2',
          condition: 'decision.confidence < 0.5',
          action: 'DENY',
          severity: 'MEDIUM',
          message: 'Low confidence decisions are not allowed',
        },
      ],
      priority: 50,
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Regulatory policy
    this.registerPolicy({
      id: 'regulatory-policy',
      name: 'Regulatory Compliance',
      type: 'REGULATORY',
      rules: [
        {
          id: 'reg-1',
          condition: 'action.affectsEmissions == true',
          action: 'LOG',
          severity: 'HIGH',
          message: 'Emissions-affecting actions must be logged',
        },
      ],
      priority: 90,
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  /**
   * Register a governance policy
   */
  registerPolicy(policy: GovernancePolicy): void {
    this.policies.set(policy.id, policy);
    logger.info({ policyId: policy.id, name: policy.name }, 'Policy registered');
    this.emit('policy:registered', policy);
  }

  /**
   * Unregister a policy
   */
  unregisterPolicy(policyId: string): void {
    this.policies.delete(policyId);
    this.emit('policy:unregistered', { policyId });
  }

  /**
   * Evaluate a decision against all policies
   */
  async evaluateDecision(
    decision: Decision,
    context: {
      tenantId: string;
      userId?: string;
      twinId: string;
      environmentState?: Record<string, unknown>;
    },
  ): Promise<PolicyEvaluationResult> {
    const violations: Violation[] = [];
    const appliedPolicies: string[] = [];
    let requiresApproval = false;
    let allowed = true;

    // Sort policies by priority (highest first)
    const sortedPolicies = Array.from(this.policies.values())
      .filter((p) => p.enabled)
      .sort((a, b) => b.priority - a.priority);

    // Evaluate each policy
    for (const policy of sortedPolicies) {
      const checks = await this.evaluatePolicy(policy, decision, context);

      for (const check of checks) {
        if (check.result === 'FAIL') {
          violations.push(...check.violations);

          // Determine action based on rule
          const rule = policy.rules.find((r) => r.id === check.ruleId);
          if (rule) {
            if (rule.action === 'DENY') {
              allowed = false;
            } else if (rule.action === 'REQUIRE_APPROVAL') {
              requiresApproval = true;
            }
          }
        }
        appliedPolicies.push(`${policy.id}:${check.ruleId}`);
      }
    }

    // Check risk level for automatic approval requirement
    if (
      this.config.requireApprovalForRisk.includes(
        decision.riskAssessment.overallRisk,
      )
    ) {
      requiresApproval = true;
    }

    // Strict mode: deny on any violation
    if (this.config.strictMode && violations.length > 0) {
      const hasCritical = violations.some((v) => v.severity === 'CRITICAL');
      if (hasCritical) {
        allowed = false;
      }
    }

    const result: PolicyEvaluationResult = {
      allowed,
      requiresApproval: allowed && requiresApproval,
      violations,
      appliedPolicies,
      confidence: this.calculateConfidence(violations, appliedPolicies.length),
      rationale: this.generateRationale(allowed, requiresApproval, violations),
    };

    // Log audit entry
    await this.logAuditEntry({
      id: uuidv4(),
      sessionId: decision.sessionId,
      action: 'EVALUATE_DECISION',
      actor: context.userId ?? 'system',
      target: decision.id,
      details: {
        decisionType: decision.type,
        result,
      },
      timestamp: new Date(),
      outcome: allowed ? 'ALLOWED' : 'DENIED',
      policyChecks: sortedPolicies.map((p) => ({
        policyId: p.id,
        ruleId: p.rules[0]?.id ?? 'unknown',
        decision,
        result: violations.some((v) => v.ruleId.startsWith(p.id)) ? 'FAIL' : 'PASS',
        violations: violations.filter((v) => v.ruleId.startsWith(p.id)),
        timestamp: new Date(),
      })),
    });

    this.emit('decision:evaluated', { decision, result });
    return result;
  }

  private async evaluatePolicy(
    policy: GovernancePolicy,
    decision: Decision,
    context: Record<string, unknown>,
  ): Promise<ComplianceCheck[]> {
    const checks: ComplianceCheck[] = [];

    for (const rule of policy.rules) {
      const result = this.evaluateRule(rule, decision, context);
      checks.push({
        policyId: policy.id,
        ruleId: rule.id,
        decision,
        result: result.passed ? 'PASS' : 'FAIL',
        violations: result.violations,
        timestamp: new Date(),
      });
    }

    return checks;
  }

  private evaluateRule(
    rule: PolicyRule,
    decision: Decision,
    context: Record<string, unknown>,
  ): { passed: boolean; violations: Violation[] } {
    const violations: Violation[] = [];

    // Simple rule evaluation (would use OPA in production)
    const evaluationContext = {
      decision,
      action: decision.action,
      riskLevel: decision.riskAssessment.overallRisk,
      confidence: decision.confidence,
      ...context,
    };

    const passed = this.evaluateCondition(rule.condition, evaluationContext);

    if (!passed) {
      violations.push({
        id: uuidv4(),
        ruleId: rule.id,
        description: rule.message,
        severity: rule.severity,
        remediation: this.suggestRemediation(rule),
      });
    }

    return { passed, violations };
  }

  private evaluateCondition(
    condition: string,
    context: Record<string, unknown>,
  ): boolean {
    // Simple condition evaluation
    // In production, this would use OPA's Rego evaluation

    try {
      // Handle common patterns
      if (condition.includes('riskLevel') && condition.includes('CRITICAL')) {
        const riskLevel = context.riskLevel as string;
        if (condition.includes('==')) {
          return riskLevel !== 'CRITICAL';
        }
      }

      if (condition.includes('confidence') && condition.includes('<')) {
        const match = condition.match(/confidence\s*<\s*([\d.]+)/);
        if (match) {
          const threshold = parseFloat(match[1]);
          return (context.confidence as number) >= threshold;
        }
      }

      if (condition.includes('action.type')) {
        const action = context.action as ProposedAction;
        const match = condition.match(/action\.type\s*==\s*"(\w+)"/);
        if (match) {
          return action.type !== match[1];
        }
      }

      // Default: allow
      return true;
    } catch (error) {
      logger.warn({ condition, error }, 'Condition evaluation failed');
      return true; // Fail open
    }
  }

  private suggestRemediation(rule: PolicyRule): string {
    switch (rule.action) {
      case 'DENY':
        return 'Modify the decision to comply with policy requirements';
      case 'REQUIRE_APPROVAL':
        return 'Submit for approval before execution';
      case 'LOG':
        return 'No action required - logging only';
      case 'ALERT':
        return 'Alert has been sent - proceed with caution';
      default:
        return 'Review policy requirements';
    }
  }

  private calculateConfidence(
    violations: Violation[],
    policiesApplied: number,
  ): number {
    if (policiesApplied === 0) return 0.5;

    const violationPenalty = violations.length * 0.1;
    const criticalPenalty = violations.filter((v) => v.severity === 'CRITICAL').length * 0.3;

    return Math.max(0.1, 1 - violationPenalty - criticalPenalty);
  }

  private generateRationale(
    allowed: boolean,
    requiresApproval: boolean,
    violations: Violation[],
  ): string {
    if (!allowed) {
      return `Decision denied due to policy violations: ${violations.map((v) => v.description).join('; ')}`;
    }

    if (requiresApproval) {
      return `Decision requires approval: ${violations.map((v) => v.description).join('; ')}`;
    }

    if (violations.length > 0) {
      return `Decision allowed with warnings: ${violations.map((v) => v.description).join('; ')}`;
    }

    return 'Decision complies with all policies';
  }

  /**
   * Evaluate proposed action before decision
   */
  async evaluateAction(
    action: ProposedAction,
    context: {
      tenantId: string;
      twinId: string;
      constraints: Constraint[];
    },
  ): Promise<{
    allowed: boolean;
    constraintViolations: Array<{ constraint: Constraint; violation: string }>;
    warnings: string[];
  }> {
    const constraintViolations: Array<{ constraint: Constraint; violation: string }> = [];
    const warnings: string[] = [];

    // Check against provided constraints
    for (const constraint of context.constraints) {
      const violation = this.checkConstraint(action, constraint);
      if (violation) {
        constraintViolations.push({ constraint, violation });
      }
    }

    // Check action-specific policies
    if (action.type === 'SAFETY_INTERVENTION') {
      warnings.push('Safety interventions should be logged and reviewed');
    }

    if (action.priority > 8) {
      warnings.push('High priority actions may require escalation');
    }

    const allowed =
      constraintViolations.filter((v) => v.constraint.hardLimit).length === 0;

    return { allowed, constraintViolations, warnings };
  }

  private checkConstraint(action: ProposedAction, constraint: Constraint): string | null {
    // Simple constraint checking
    if (constraint.type === 'SAFETY') {
      // Check if action might violate safety limits
      const params = action.parameters;
      if (typeof params.value === 'number') {
        const match = constraint.expression.match(/<\s*([\d.]+)/);
        if (match) {
          const limit = parseFloat(match[1]);
          if (params.value > limit) {
            return `Action would exceed safety limit of ${limit}`;
          }
        }
      }
    }

    return null;
  }

  /**
   * Request approval for a decision
   */
  async requestApproval(
    decision: Decision,
    requestedBy: string,
    reason: string,
  ): Promise<{
    approvalId: string;
    status: 'PENDING';
    expiresAt: Date;
  }> {
    const approvalId = uuidv4();
    const expiresAt = new Date(Date.now() + 24 * 3600 * 1000); // 24 hours

    await this.logAuditEntry({
      id: uuidv4(),
      sessionId: decision.sessionId,
      action: 'REQUEST_APPROVAL',
      actor: requestedBy,
      target: decision.id,
      details: { approvalId, reason },
      timestamp: new Date(),
      outcome: 'PENDING',
      policyChecks: [],
    });

    this.emit('approval:requested', { approvalId, decision, requestedBy, reason });

    return { approvalId, status: 'PENDING', expiresAt };
  }

  /**
   * Process approval response
   */
  async processApproval(
    approvalId: string,
    decision: Decision,
    approved: boolean,
    approvedBy: string,
    comments?: string,
  ): Promise<void> {
    await this.logAuditEntry({
      id: uuidv4(),
      sessionId: decision.sessionId,
      action: approved ? 'APPROVE_DECISION' : 'REJECT_DECISION',
      actor: approvedBy,
      target: decision.id,
      details: { approvalId, comments },
      timestamp: new Date(),
      outcome: approved ? 'APPROVED' : 'REJECTED',
      policyChecks: [],
    });

    this.emit('approval:processed', {
      approvalId,
      decision,
      approved,
      approvedBy,
      comments,
    });
  }

  /**
   * Record an override of policy
   */
  async recordOverride(
    decision: Decision,
    overriddenBy: string,
    reason: string,
    violations: Violation[],
  ): Promise<{ allowed: boolean; overrideId: string | null }> {
    // Check override limits
    const overrides = this.overrideHistory.get(overriddenBy) ?? [];
    const recentOverrides = overrides.filter(
      (d) => Date.now() - d.getTime() < 3600000,
    );

    if (recentOverrides.length >= this.config.maxOverridesPerHour) {
      return { allowed: false, overrideId: null };
    }

    const overrideId = uuidv4();

    // Record override
    overrides.push(new Date());
    this.overrideHistory.set(overriddenBy, overrides);

    await this.logAuditEntry({
      id: uuidv4(),
      sessionId: decision.sessionId,
      action: 'OVERRIDE_POLICY',
      actor: overriddenBy,
      target: decision.id,
      details: {
        overrideId,
        reason,
        violations: violations.map((v) => ({
          ruleId: v.ruleId,
          description: v.description,
        })),
      },
      timestamp: new Date(),
      outcome: 'OVERRIDE',
      policyChecks: [],
    });

    this.emit('policy:overridden', {
      overrideId,
      decision,
      overriddenBy,
      reason,
      violations,
    });

    logger.warn(
      { overrideId, decisionId: decision.id, overriddenBy },
      'Policy override recorded',
    );

    return { allowed: true, overrideId };
  }

  /**
   * Log an audit entry
   */
  private async logAuditEntry(entry: AuditEntry): Promise<void> {
    this.auditLog.push(entry);

    // Keep last 10000 entries in memory
    if (this.auditLog.length > 10000) {
      this.auditLog.shift();
    }

    if (this.config.auditAll) {
      this.emit('audit:logged', entry);
    }
  }

  /**
   * Query audit log
   */
  queryAuditLog(filters: {
    sessionId?: string;
    actor?: string;
    action?: string;
    outcome?: string;
    fromDate?: Date;
    toDate?: Date;
    limit?: number;
  }): AuditLog {
    let entries = this.auditLog;

    if (filters.sessionId) {
      entries = entries.filter((e) => e.sessionId === filters.sessionId);
    }
    if (filters.actor) {
      entries = entries.filter((e) => e.actor === filters.actor);
    }
    if (filters.action) {
      entries = entries.filter((e) => e.action === filters.action);
    }
    if (filters.outcome) {
      entries = entries.filter((e) => e.outcome === filters.outcome);
    }
    if (filters.fromDate) {
      entries = entries.filter((e) => e.timestamp >= filters.fromDate!);
    }
    if (filters.toDate) {
      entries = entries.filter((e) => e.timestamp <= filters.toDate!);
    }

    const totalCount = entries.length;
    const violationCount = entries.filter((e) =>
      e.policyChecks.some((c) => c.violations.length > 0),
    ).length;
    const overrideCount = entries.filter((e) => e.outcome === 'OVERRIDE').length;

    if (filters.limit) {
      entries = entries.slice(-filters.limit);
    }

    return {
      entries,
      totalCount,
      violationCount,
      overrideCount,
    };
  }

  /**
   * Get policy summary
   */
  getPolicySummary(): Array<{
    id: string;
    name: string;
    type: string;
    ruleCount: number;
    enabled: boolean;
    priority: number;
  }> {
    return Array.from(this.policies.values()).map((p) => ({
      id: p.id,
      name: p.name,
      type: p.type,
      ruleCount: p.rules.length,
      enabled: p.enabled,
      priority: p.priority,
    }));
  }

  /**
   * Enable/disable a policy
   */
  togglePolicy(policyId: string, enabled: boolean): void {
    const policy = this.policies.get(policyId);
    if (policy) {
      policy.enabled = enabled;
      policy.updatedAt = new Date();
      this.emit('policy:toggled', { policyId, enabled });
    }
  }
}

export default GovernanceEngine;
