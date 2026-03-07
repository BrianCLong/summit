import type { BranchRecord } from "../branching/branchLifecycle";
import type { Claim, WriteSet } from "../ledger/writeset";
import type { ReviewerChecklistArtifact } from "./reviewerChecklist";
import { isChecklistComplete } from "./reviewerChecklist";
import {
  buildMergeBlockedReport,
  computeScore,
  summarizeReadinessStatus,
  type BranchReadinessScorecard,
  type GateResult,
  type MergeBlockedReport,
} from "./readinessReport";

export interface ReadinessPolicy {
  minimum_provenance_coverage: number; // 0..1
  contradiction_budget: number; // max allowed open contradictions
  max_unresolved_supersession_chains: number; // max allowed
  minimum_source_diversity: number; // unique provenance refs count
  require_complete_checklist: boolean;
}

export interface EvaluateBranchReadinessArgs {
  branch: BranchRecord;
  writesets: WriteSet[];
  checklist?: ReviewerChecklistArtifact;
  policy: ReadinessPolicy;
  now: string;
}

export interface EvaluateBranchReadinessResult {
  scorecard: BranchReadinessScorecard;
  merge_blocked_report?: MergeBlockedReport;
}

function allClaims(writesets: WriteSet[]): Claim[] {
  return writesets.flatMap((w) => w.claims);
}

function claimsForBranch(branch: BranchRecord, writesets: WriteSet[]): Claim[] {
  const ids = new Set(branch.claim_ids);
  return allClaims(writesets).filter((c) => ids.has(c.claim_id));
}

function provenanceCoverage(claims: Claim[]): number {
  if (claims.length === 0) return 0;
  const withProv = claims.filter((c) => (c.provenance_refs?.length ?? 0) > 0).length;
  return withProv / claims.length;
}

function countOpenContradictions(branchClaims: Claim[], universe: Claim[]): number {
  const ids = new Set(branchClaims.map((c) => c.claim_id));
  return universe.filter(
    (c) =>
      c.status !== "rejected" &&
      (c.contradicts ?? []).some((target) => ids.has(target)),
  ).length;
}

function countUnresolvedSupersessionChains(branchClaims: Claim[], universe: Claim[]): number {
  const ids = new Set(branchClaims.map((c) => c.claim_id));
  return branchClaims.filter((claim) => {
    const superseders = universe.filter((c) => (c.supersedes ?? []).includes(claim.claim_id));
    if (superseders.length === 0) return false;
    return !superseders.some((c) => c.status === "validated");
  }).length;
}

function sourceDiversityCount(branchClaims: Claim[]): number {
  const refs = new Set<string>();
  for (const claim of branchClaims) {
    for (const ref of claim.provenance_refs ?? []) refs.add(ref);
  }
  return refs.size;
}

export function evaluateBranchReadiness(
  args: EvaluateBranchReadinessArgs,
): EvaluateBranchReadinessResult {
  const branchClaims = claimsForBranch(args.branch, args.writesets);
  const universe = allClaims(args.writesets);

  const provCoverage = provenanceCoverage(branchClaims);
  const openContradictions = countOpenContradictions(branchClaims, universe);
  const unresolvedSupersessions = countUnresolvedSupersessionChains(branchClaims, universe);
  const sourceDiversity = sourceDiversityCount(branchClaims);
  const checklistComplete = args.checklist ? isChecklistComplete(args.checklist) : false;

  const gates: GateResult[] = [
    {
      gate_id: "minimum_provenance_coverage",
      status:
        provCoverage >= args.policy.minimum_provenance_coverage ? "pass" : "fail",
      value: provCoverage,
      threshold: args.policy.minimum_provenance_coverage,
      message:
        provCoverage >= args.policy.minimum_provenance_coverage
          ? `Provenance coverage OK (${provCoverage.toFixed(2)})`
          : `Provenance coverage below threshold (${provCoverage.toFixed(2)} < ${args.policy.minimum_provenance_coverage.toFixed(2)})`,
    },
    {
      gate_id: "contradiction_budget",
      status:
        openContradictions <= args.policy.contradiction_budget ? "pass" : "fail",
      value: openContradictions,
      threshold: args.policy.contradiction_budget,
      message:
        openContradictions <= args.policy.contradiction_budget
          ? `Contradiction budget OK (${openContradictions})`
          : `Contradiction budget exceeded (${openContradictions} > ${args.policy.contradiction_budget})`,
    },
    {
      gate_id: "unresolved_supersession_chains",
      status:
        unresolvedSupersessions <= args.policy.max_unresolved_supersession_chains
          ? "pass"
          : "fail",
      value: unresolvedSupersessions,
      threshold: args.policy.max_unresolved_supersession_chains,
      message:
        unresolvedSupersessions <= args.policy.max_unresolved_supersession_chains
          ? `Supersession chains OK (${unresolvedSupersessions})`
          : `Too many unresolved supersession chains (${unresolvedSupersessions} > ${args.policy.max_unresolved_supersession_chains})`,
    },
    {
      gate_id: "source_diversity_threshold",
      status:
        sourceDiversity >= args.policy.minimum_source_diversity ? "pass" : "warn",
      value: sourceDiversity,
      threshold: args.policy.minimum_source_diversity,
      message:
        sourceDiversity >= args.policy.minimum_source_diversity
          ? `Source diversity OK (${sourceDiversity})`
          : `Source diversity below threshold (${sourceDiversity} < ${args.policy.minimum_source_diversity})`,
    },
    {
      gate_id: "reviewer_checklist",
      status:
        !args.policy.require_complete_checklist || checklistComplete ? "pass" : "warn",
      value: checklistComplete,
      threshold: args.policy.require_complete_checklist,
      message:
        !args.policy.require_complete_checklist || checklistComplete
          ? "Reviewer checklist complete"
          : "Reviewer checklist incomplete",
    },
  ];

  const status = summarizeReadinessStatus(gates);
  const { score, max_score } = computeScore(gates);

  const blocked_reasons = gates.filter((g) => g.status === "fail").map((g) => g.message);
  const warnings = gates.filter((g) => g.status === "warn").map((g) => g.message);

  const scorecard: BranchReadinessScorecard = {
    scorecard_id: `score-${args.branch.branch_id}-${args.now}`,
    branch_id: args.branch.branch_id,
    created_at: args.now,
    status,
    score,
    max_score,
    gates,
    blocked_reasons,
    warnings,
  };

  return {
    scorecard,
    merge_blocked_report:
      status === "blocked"
        ? buildMergeBlockedReport(args.branch.branch_id, args.now, gates)
        : undefined,
  };
}
