import { readFile } from 'node:fs/promises';
import { FederatedPlan, SiloId, SiloSubplan, TraceEvent } from './types.js';

type RawFederatedPlan = {
  subplans: Array<{
    silo: SiloId;
    source_alias: string;
    dataset: string;
    pushed_projections: string[];
    pushed_filters: Array<{
      table: string;
      column: string;
      op: string;
      value: Record<string, unknown>;
    }>;
  }>;
  coordinator: {
    join_strategy: Record<string, unknown> | null;
    output_projections: Array<{
      table: string;
      column: string;
      alias: string | null;
    }>;
  };
  compliance: {
    events: Array<{
      policy_id: string;
      silo: SiloId | null;
      message: string;
    }>;
  };
};

function assertValidPlan(value: unknown): asserts value is RawFederatedPlan {
  if (!value || typeof value !== 'object') {
    throw new Error('Plan payload must be an object');
  }
  const raw = value as Record<string, unknown>;
  if (!Array.isArray(raw.subplans)) {
    throw new Error('Plan must include an array of subplans');
  }
  if (typeof raw.coordinator !== 'object' || raw.coordinator === null) {
    throw new Error('Plan must include a coordinator block');
  }
  const compliance = raw.compliance as Record<string, unknown> | undefined;
  if (!compliance || !Array.isArray(compliance.events)) {
    throw new Error('Plan must include compliance events');
  }
}

function normalizePlan(raw: RawFederatedPlan): FederatedPlan {
  return {
    subplans: raw.subplans.map((subplan) => ({
      silo: subplan.silo,
      sourceAlias: subplan.source_alias,
      dataset: subplan.dataset,
      pushedProjections: [...subplan.pushed_projections],
      pushedFilters: subplan.pushed_filters.map((filter) => ({
        table: filter.table,
        column: filter.column,
        op: filter.op,
        value: filter.value,
      })),
    })),
    coordinator: {
      joinStrategy: raw.coordinator.join_strategy ?? null,
      outputProjections: raw.coordinator.output_projections.map((projection) => ({
        table: projection.table,
        column: projection.column,
        alias: projection.alias ?? null,
      })),
    },
    compliance: {
      events: raw.compliance.events.map((event) => ({
        policyId: event.policy_id,
        silo: event.silo,
        message: event.message,
      })),
    },
  };
}

export async function loadPlanFromFile(path: string): Promise<FederatedPlan> {
  const raw = await readFile(path, 'utf-8');
  return parseFederatedPlan(raw);
}

export function parseFederatedPlan(payload: string | object): FederatedPlan {
  const rawValue = typeof payload === 'string' ? JSON.parse(payload) : payload;
  assertValidPlan(rawValue);
  return normalizePlan(rawValue);
}

export function policyGateSummary(plan: FederatedPlan): Record<string, number> {
  return plan.compliance.events.reduce<Record<string, number>>((acc, event) => {
    const next = acc[event.policyId] ?? 0;
    acc[event.policyId] = next + 1;
    return acc;
  }, {});
}

export function getSubplansForSilo(plan: FederatedPlan, silo: SiloId): SiloSubplan[] {
  return plan.subplans.filter((subplan) => subplan.silo === silo);
}

export function complianceTimeline(plan: FederatedPlan): string[] {
  return plan.compliance.events.map((event) => `${event.policyId} :: ${event.message}`);
}

export function findFirstPolicyEvent(plan: FederatedPlan, policyId: string): TraceEvent | undefined {
  return plan.compliance.events.find((event) => event.policyId === policyId);
}

export * from './types.js';
