// API types

export type Budget = {
  generated_at: string;
  perf: { rps_last_60s: number; p50_ms_last_60s: number; p95_ms_last_60s: number };
  windows: { m1: any; h1: any; d1: any };
  budgets: {
    [key: string]: {
      spent_usd: number;
      daily_budget_usd: number;
      fraction_used: number;
      resets_at: string;
    };
  };
};

export type Run = {
  run_id: string;
  status: string;
  log_tail?: string;
};

export type NodeRouting = {
  decision?: { model: string; confidence: number; reason: string };
  candidates?: { model: string; score: number; p50_ms?: number }[];
  prompt_preview?: { system: string; user: string };
  policy?: { allow: boolean; reason: string; max_loa: number; hosted_allowed: boolean };
  error?: string;
};

export type Evidence = {
  runId: string;
  summary: { nodes: number; sbom: number; cosign: number; slsa: number; pass: boolean };
  nodes: {
    nodeId: string;
    sbom: { present: boolean; url?: string | null };
    cosign: { present: boolean; verified?: boolean; url?: string | null };
    slsa: { present: boolean; level?: string | null; url?: string | null };
  }[];
};

export type ServingMetrics = {
  enabled: boolean;
  qDepthMax: number;
  batchMax: number;
  kvHitMin: number;
};

export type CITrends = {
  // Define structure based on actual data from /ci/trends
  // Example: { pipeline: string; points: { ts: number; p95: number; }[]; }
};
