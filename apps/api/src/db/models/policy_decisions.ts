import { randomUUID } from "node:crypto";

import {
  type PreflightObligation,
  type PreflightRequestContract,
} from "../../contracts/actions.js";
import { type PolicyDecisionResult } from "../../services/policyService.js";

export interface PolicyDecisionRecord {
  id: string;
  subjectId: string;
  action: string;
  resourceId?: string;
  allow: boolean;
  reason?: string;
  obligations: PreflightObligation[];
  redactions: string[];
  createdAt: string;
  request: PreflightRequestContract;
  rawDecision: unknown;
}

export class PolicyDecisionStore {
  private records: PolicyDecisionRecord[] = [];

  constructor(private readonly clock: () => Date = () => new Date()) {}

  async insert(
    request: PreflightRequestContract,
    decision: PolicyDecisionResult
  ): Promise<PolicyDecisionRecord> {
    const record: PolicyDecisionRecord = {
      id: randomUUID(),
      subjectId: request.subject.id,
      action: request.action.name,
      resourceId: request.resource?.id,
      allow: decision.allow,
      reason: decision.reason,
      obligations: decision.obligations,
      redactions: decision.redactions,
      createdAt: this.clock().toISOString(),
      request,
      rawDecision: decision.raw,
    };

    this.records.push(record);
    return record;
  }

  async all(): Promise<PolicyDecisionRecord[]> {
    return [...this.records];
  }

  async clear(): Promise<void> {
    this.records = [];
  }
}
