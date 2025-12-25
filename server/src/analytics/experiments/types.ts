export interface Variant {
  id: string;
  name: string;
  weight: number; // 0-100, sum should be 100 (or normalized)
}

export interface Experiment {
  id: string;
  owner: string;
  hypothesis: string;
  variants: Variant[];
  allocation: number; // Percentage of users eligible (0-100)
  startDate: string;
  endDate?: string;
  status: 'active' | 'inactive' | 'archived';
  guardrails?: string[]; // e.g., ["latency_monitor"]
}

export interface Assignment {
  experimentId: string;
  variantId: string | null; // null if not allocated (e.g. out of allocation %)
  reason: 'allocated' | 'exclusion' | 'inactive' | 'fallback';
}

export interface ExperimentConfig {
    salt: string;
}
