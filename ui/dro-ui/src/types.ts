export interface SignedPlan {
  plan_id: string;
  created_at: string;
  objective_cost: number;
  solver_status: string;
  placements: Record<string, string[]>;
  inputs_digest: string;
  signature: {
    algorithm: string;
    value: string;
  };
}

export interface PlanDiffChange {
  dataset_id: string;
  from?: string[];
  to?: string[];
}

export interface PlanDiffResult {
  plan_id_from: string | undefined;
  plan_id_to: string | undefined;
  objective_delta: number;
  changes: {
    added: PlanDiffChange[];
    removed: PlanDiffChange[];
    modified: PlanDiffChange[];
  };
  metadata_changes: Record<string, { from: string | undefined; to: string | undefined }>;
}
