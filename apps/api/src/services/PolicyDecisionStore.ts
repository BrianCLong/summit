import { randomUUID } from 'node:crypto';
import { hashExecutionInput } from '../lib/hash.js';
import { type PreflightRequestContract } from '../contracts/actions.js';

import {
  type PreflightObligation,
  type PolicyDecisionResult,
} from './policyService.js';

export interface PreflightRecord {
  id: string;
  inputHash: string;
  action?: string;
  expiresAt?: string;
  context?: Record<string, unknown>;
  request?: PreflightRequestContract;
  allow: boolean;
  reason?: string;
  obligations: PreflightObligation[];
  redactions: string[];
  rawDecision?: unknown;
  createdAt: string;
}

export interface ExecutionRecord {
  executionId: string;
  correlationId: string;
  executedAt: string;
}

/**
 * Unified Policy Decision Store
 * Consolidates db/models/policy_decisions and services/PolicyDecisionStore
 */
export interface PolicyDecisionStore {
  getPreflight(id: string): Promise<PreflightRecord | undefined>;
  recordExecution(
    preflightId: string,
    execution: ExecutionRecord,
  ): Promise<void>;
  insert(
    request: PreflightRequestContract,
    decision: PolicyDecisionResult,
  ): Promise<PreflightRecord>;
}

export class InMemoryPolicyDecisionStore implements PolicyDecisionStore {
  private preflights = new Map<string, PreflightRecord>();
  private executions = new Map<string, ExecutionRecord[]>();

  constructor(private readonly clock: () => Date = () => new Date()) {}

  async getPreflight(id: string): Promise<PreflightRecord | undefined> {
    return this.preflights.get(id);
  }

  async recordExecution(
    preflightId: string,
    execution: ExecutionRecord,
  ): Promise<void> {
    const records = this.executions.get(preflightId) ?? [];
    records.push(execution);
    this.executions.set(preflightId, records);
  }

  /**
   * Unified insert method to address tech debt of multiple store implementations
   */
  async insert(
    request: PreflightRequestContract,
    decision: PolicyDecisionResult,
  ): Promise<PreflightRecord> {
    const id = `pre_${randomUUID()}`;
    const record: PreflightRecord = {
      id,
      action: request.action.name,
      inputHash: hashExecutionInput({
        action: request.action.name,
        input: request.resource as any,
      }),
      request,
      allow: decision.allow,
      reason: decision.reason,
      obligations: decision.obligations,
      redactions: decision.redactions,
      rawDecision: decision.raw,
      createdAt: this.clock().toISOString(),
      // Default expiry of 1 hour
      expiresAt: new Date(this.clock().getTime() + 60 * 60 * 1000).toISOString(),
    };

    this.preflights.set(id, record);
    return record;
  }

  upsertPreflight(payload: {
    id: string;
    input: unknown;
    action?: string;
    expiresAt?: string;
    context?: Record<string, unknown>;
    request?: PreflightRequestContract;
  }): PreflightRecord {
    const record: PreflightRecord = {
      id: payload.id,
      action: payload.action,
      inputHash: hashExecutionInput({
        action: payload.action,
        input: payload.input as any,
      }),
      expiresAt: payload.expiresAt,
      context: payload.context,
      request: payload.request,
      allow: true, // Legacy compatibility
      obligations: [],
      redactions: [],
      createdAt: this.clock().toISOString(),
    };
    this.preflights.set(payload.id, record);
    return record;
  }

  getExecutions(preflightId: string): ExecutionRecord[] {
    return this.executions.get(preflightId) ?? [];
  }
}
