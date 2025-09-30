import type { PlanDiffResult, SignedPlan } from './types';

type NormalizedPlan = {
  plan_id?: string;
  objective_cost: number;
  solver_status?: string;
  inputs_digest?: string;
  placements: Record<string, string[]>;
};

function normalize(plan: SignedPlan | null | undefined): NormalizedPlan {
  if (!plan) {
    return {
      plan_id: undefined,
      objective_cost: 0,
      solver_status: undefined,
      inputs_digest: undefined,
      placements: {},
    };
  }

  const normalizedPlacements: Record<string, string[]> = {};
  for (const [datasetId, regions] of Object.entries(plan.placements || {})) {
    normalizedPlacements[datasetId] = [...regions].sort();
  }

  return {
    plan_id: plan.plan_id,
    objective_cost: Number(plan.objective_cost ?? 0),
    solver_status: plan.solver_status,
    inputs_digest: plan.inputs_digest,
    placements: normalizedPlacements,
  };
}

export function computePlanDiff(previous: SignedPlan, current: SignedPlan): PlanDiffResult {
  const prev = normalize(previous);
  const curr = normalize(current);

  const datasetIds = Array.from(
    new Set<string>([...Object.keys(prev.placements), ...Object.keys(curr.placements)]),
  ).sort();

  const added: PlanDiffResult['changes']['added'] = [];
  const removed: PlanDiffResult['changes']['removed'] = [];
  const modified: PlanDiffResult['changes']['modified'] = [];

  for (const datasetId of datasetIds) {
    const prevRegions = prev.placements[datasetId] ?? [];
    const currRegions = curr.placements[datasetId] ?? [];

    if (prevRegions.length === 0 && currRegions.length > 0) {
      added.push({ dataset_id: datasetId, to: currRegions });
    } else if (prevRegions.length > 0 && currRegions.length === 0) {
      removed.push({ dataset_id: datasetId, from: prevRegions });
    } else if (JSON.stringify(prevRegions) !== JSON.stringify(currRegions)) {
      modified.push({ dataset_id: datasetId, from: prevRegions, to: currRegions });
    }
  }

  const metadataChanges: PlanDiffResult['metadata_changes'] = {};
  for (const key of ['solver_status', 'inputs_digest'] as const) {
    const prevValue = prev[key];
    const currValue = curr[key];
    if (prevValue !== currValue) {
      metadataChanges[key] = {
        from: prevValue as string | undefined,
        to: currValue as string | undefined,
      };
    }
  }

  return {
    plan_id_from: prev.plan_id,
    plan_id_to: curr.plan_id,
    objective_delta: Number((curr.objective_cost - prev.objective_cost).toFixed(6)),
    changes: { added, removed, modified },
    metadata_changes: metadataChanges,
  };
}

export function summarizePlan(plan: SignedPlan | null): string {
  if (!plan) {
    return 'No plan loaded.';
  }
  const placements = Object.entries(plan.placements || {})
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dataset, regions]) => `${dataset}: ${regions.join(', ') || '—'}`)
    .join('\n');
  return [
    `Plan ID: ${plan.plan_id}`,
    `Objective cost: ${plan.objective_cost.toFixed(4)}`,
    `Solver status: ${plan.solver_status}`,
    placements ? 'Placements:\n' + placements : 'No placements.',
  ].join('\n');
}
