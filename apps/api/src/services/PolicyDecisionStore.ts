import { hashExecutionInput } from "../lib/hash.js";
import { type PreflightRequestContract } from "../contracts/actions.js";

export interface PreflightRecord {
  id: string;
  inputHash: string;
  action?: string;
  expiresAt?: string;
  context?: Record<string, unknown>;
  request?: PreflightRequestContract;
}

export interface ExecutionRecord {
  executionId: string;
  correlationId: string;
  executedAt: string;
}

export interface PolicyDecisionStore {
  getPreflight(id: string): Promise<PreflightRecord | undefined>;
  recordExecution(preflightId: string, execution: ExecutionRecord): Promise<void>;
}

export class InMemoryPolicyDecisionStore implements PolicyDecisionStore {
  private preflights = new Map<string, PreflightRecord>();
  private executions = new Map<string, ExecutionRecord[]>();

  async getPreflight(id: string): Promise<PreflightRecord | undefined> {
    return this.preflights.get(id);
  }

  async recordExecution(preflightId: string, execution: ExecutionRecord): Promise<void> {
    const records = this.executions.get(preflightId) ?? [];
    records.push(execution);
    this.executions.set(preflightId, records);
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
    };
    this.preflights.set(payload.id, record);
    return record;
  }

  getExecutions(preflightId: string): ExecutionRecord[] {
    return this.executions.get(preflightId) ?? [];
  }
}
