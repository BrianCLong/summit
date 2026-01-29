import type { Procedure, ProcedurePlan } from '../types';
import { stableStringify } from '../utils/stableStringify';

function sortObjectKeys(value: Record<string, unknown>): Record<string, unknown> {
  return Object.keys(value)
    .sort((left, right) => left.localeCompare(right))
    .reduce<Record<string, unknown>>((acc, key) => {
      acc[key] = value[key];
      return acc;
    }, {});
}

export function compileProcedure(procedure: Procedure): ProcedurePlan {
  const inputs = procedure.inputs ? sortObjectKeys(procedure.inputs) : {};

  return {
    id: procedure.id,
    version: procedure.version,
    source: {
      procedureId: procedure.id,
      procedureVersion: procedure.version,
    },
    inputs,
    steps: procedure.steps.map((step, index) => ({
      id: `step-${String(index + 1).padStart(2, '0')}`,
      name: step.name,
      type: step.type,
      with: step.with ? sortObjectKeys(step.with) : {},
    })),
  };
}

export function serializePlan(plan: ProcedurePlan): string {
  return stableStringify(plan);
}
