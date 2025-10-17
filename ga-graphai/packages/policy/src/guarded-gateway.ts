import type {
  PolicyEvaluationRequest,
  PolicyEvaluationResult,
  PolicyObligation,
} from 'common-types';
import { PolicyEngine } from './index.js';

export interface GuardedEvaluationContext {
  riskScore?: number;
  reason?: string;
  correlationId?: string;
  metadata?: Record<string, unknown>;
}

export interface GuardedDecision {
  allowed: boolean;
  requiresApproval: boolean;
  auditRef: string;
  evaluation: PolicyEvaluationResult;
  obligations: PolicyObligation[];
}

export interface ApprovalRecord {
  approved: boolean;
  approver?: string;
  approvedAt?: string;
  notes?: string;
}

export interface GuardedPolicyGatewayOptions {
  engine?: PolicyEngine;
  riskThreshold?: number;
  auditSink?: (entry: GuardedAuditEntry) => void;
}

export interface GuardedAuditEntry {
  id: string;
  timestamp: string;
  request: PolicyEvaluationRequest;
  evaluation: PolicyEvaluationResult;
  requiresApproval: boolean;
  context?: GuardedEvaluationContext;
  approval?: ApprovalRecord;
}

const DEFAULT_RISK_THRESHOLD = 0.55;

function buildAuditId(request: PolicyEvaluationRequest, correlationId?: string) {
  return [
    correlationId ?? `${Date.now()}`,
    request.action,
    request.resource,
  ].join(':');
}

export class GuardedPolicyGateway {
  private readonly engine: PolicyEngine;
  private readonly riskThreshold: number;
  private readonly auditSink?: GuardedPolicyGatewayOptions['auditSink'];
  private readonly approvalQueue = new Map<string, ApprovalRecord>();

  constructor(options?: GuardedPolicyGatewayOptions) {
    this.engine = options?.engine ?? new PolicyEngine();
    this.riskThreshold = options?.riskThreshold ?? DEFAULT_RISK_THRESHOLD;
    this.auditSink = options?.auditSink;
  }

  evaluate(
    request: PolicyEvaluationRequest,
    context?: GuardedEvaluationContext,
  ): GuardedDecision {
    const evaluation = this.engine.evaluate(request);
    if (!evaluation.allowed) {
      const auditRef = buildAuditId(request, context?.correlationId);
      this.emitAudit({
        id: auditRef,
        timestamp: new Date().toISOString(),
        request,
        evaluation,
        requiresApproval: false,
        context,
      });
      return {
        allowed: false,
        requiresApproval: false,
        auditRef,
        evaluation,
        obligations: evaluation.obligations,
      };
    }

    const requiresApproval = this.requiresApproval(evaluation, context);
    const auditRef = buildAuditId(request, context?.correlationId);
    if (requiresApproval) {
      this.approvalQueue.set(auditRef, { approved: false });
    }
    this.emitAudit({
      id: auditRef,
      timestamp: new Date().toISOString(),
      request,
      evaluation,
      requiresApproval,
      context,
      approval: this.approvalQueue.get(auditRef),
    });

    return {
      allowed: evaluation.allowed && (!requiresApproval || this.isApproved(auditRef)),
      requiresApproval,
      auditRef,
      evaluation,
      obligations: evaluation.obligations,
    };
  }

  approve(auditRef: string, approver: string, notes?: string): ApprovalRecord {
    const record = this.approvalQueue.get(auditRef) ?? { approved: false };
    record.approved = true;
    record.approver = approver;
    record.notes = notes;
    record.approvedAt = new Date().toISOString();
    this.approvalQueue.set(auditRef, record);
    this.emitAudit({
      id: auditRef,
      timestamp: record.approvedAt,
      request: { action: 'approval', resource: auditRef, context: { tenantId: '', userId: approver, roles: [] } },
      evaluation: { allowed: true, effect: 'allow', matchedRules: [], reasons: [], obligations: [], trace: [] },
      requiresApproval: false,
      approval: record,
    });
    return record;
  }

  isApproved(auditRef: string): boolean {
    return this.approvalQueue.get(auditRef)?.approved ?? false;
  }

  private requiresApproval(
    evaluation: PolicyEvaluationResult,
    context?: GuardedEvaluationContext,
  ): boolean {
    const riskScore = context?.riskScore ?? 0;
    const hasHighRiskTag = evaluation.matchedRules.some((rule) => rule.includes('high-risk'));
    return hasHighRiskTag || riskScore >= this.riskThreshold;
  }

  private emitAudit(entry: GuardedAuditEntry): void {
    if (this.auditSink) {
      this.auditSink(entry);
    }
  }
}

export { PolicyEngine };
