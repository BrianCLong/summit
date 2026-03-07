export type GateStatus = "pass" | "warn" | "fail";
export type BranchReadinessStatus = "ready" | "needs_review" | "blocked";

export interface GateResult {
  gate_id:
    | "minimum_provenance_coverage"
    | "contradiction_budget"
    | "unresolved_supersession_chains"
    | "source_diversity_threshold"
    | "reviewer_checklist";
  status: GateStatus;
  value: number | boolean;
  threshold?: number | boolean;
  message: string;
}

export interface BranchReadinessScorecard {
  scorecard_id: string;
  branch_id: string;
  created_at: string;
  status: BranchReadinessStatus;
  score: number;
  max_score: number;
  gates: GateResult[];
  blocked_reasons: string[];
  warnings: string[];
}

export interface MergeBlockedReport {
  report_id: string;
  branch_id: string;
  created_at: string;
  blocked_reasons: string[];
  failing_gates: GateResult[];
}

export function summarizeReadinessStatus(gates: GateResult[]): BranchReadinessStatus {
  if (gates.some((g) => g.status === "fail")) return "blocked";
  if (gates.some((g) => g.status === "warn")) return "needs_review";
  return "ready";
}

export function computeScore(gates: GateResult[]): { score: number; max_score: number } {
  const max_score = gates.length;
  const score = gates.reduce((acc, gate) => {
    if (gate.status === "pass") return acc + 1;
    if (gate.status === "warn") return acc + 0.5;
    return acc;
  }, 0);

  return { score, max_score };
}

export function buildMergeBlockedReport(
  branchId: string,
  now: string,
  gates: GateResult[],
): MergeBlockedReport {
  const failing_gates = gates.filter((g) => g.status === "fail");
  return {
    report_id: `blocked-${branchId}-${now}`,
    branch_id: branchId,
    created_at: now,
    blocked_reasons: failing_gates.map((g) => g.message),
    failing_gates,
  };
}
