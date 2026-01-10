import crypto from 'crypto';
import { AppendOnlyAuditStore, type AuditClassification } from '../../audit/appendOnlyAuditStore.js';

export interface PolicyDecisionInput {
  customer: string;
  actorId: string;
  action: string;
  resourceId: string;
  resourceType?: string;
  classification: AuditClassification;
  policyVersion: string;
  decisionId?: string;
  traceId?: string;
  metadata?: Record<string, unknown>;
}

export class AuditTrailService {
  constructor(private readonly store = new AppendOnlyAuditStore()) {}

  async recordPolicyDecision(input: PolicyDecisionInput): Promise<void> {
    await this.store.append({
      version: 'audit_event_v1',
      actor: { type: 'service', id: input.actorId },
      action: input.action,
      resource: { type: input.resourceType ?? 'policy_target', id: input.resourceId },
      classification: input.classification,
      policy_version: input.policyVersion,
      decision_id: input.decisionId ?? crypto.randomUUID(),
      trace_id: input.traceId ?? crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      customer: input.customer,
      metadata: input.metadata,
    });
  }
}

export const auditTrailService = new AuditTrailService();
