export type BranchStatus =
  | "draft"
  | "under_review"
  | "approved"
  | "promoted"
  | "rejected";

export interface BranchRecord {
  branch_id: string;
  title: string;
  description?: string;
  status: BranchStatus;
  created_at: string;
  updated_at: string;
  created_by: string;
  last_reviewed_by?: string;
  approved_at?: string;
  promoted_at?: string;
  rejected_at?: string;
  open_contradictions: number;
  claim_ids: string[];
  source_writeset_ids: string[];
  metadata?: Record<string, unknown>;
}

export interface BranchTransitionRule {
  from: BranchStatus;
  to: BranchStatus[];
}

export const BRANCH_TRANSITIONS: BranchTransitionRule[] = [
  { from: "draft", to: ["under_review", "rejected"] },
  { from: "under_review", to: ["approved", "rejected", "draft"] },
  { from: "approved", to: ["promoted", "rejected", "under_review"] },
  { from: "promoted", to: [] },
  { from: "rejected", to: ["draft"] },
];

export function canTransitionBranch(from: BranchStatus, to: BranchStatus): boolean {
  const rule = BRANCH_TRANSITIONS.find((r) => r.from === from);
  return Boolean(rule?.to.includes(to));
}

export function transitionBranch(
  branch: BranchRecord,
  to: BranchStatus,
  actorId: string,
  now: string,
): BranchRecord {
  if (!canTransitionBranch(branch.status, to)) {
    throw new Error(`Invalid branch transition: ${branch.status} -> ${to}`);
  }

  const next: BranchRecord = {
    ...branch,
    status: to,
    updated_at: now,
    last_reviewed_by: actorId,
  };

  if (to === "approved") next.approved_at = now;
  if (to === "promoted") next.promoted_at = now;
  if (to === "rejected") next.rejected_at = now;

  return next;
}

export function computeOpenContradictions(
  claimIds: string[],
  allClaims: Array<{
    claim_id: string;
    contradicts?: string[];
    status: string;
  }>,
): number {
  const claimSet = new Set(claimIds);
  return allClaims.filter(
    (c) =>
      c.status !== "rejected" &&
      (c.contradicts ?? []).some((target) => claimSet.has(target)),
  ).length;
}
