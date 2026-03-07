import type { JournalStore, JournalEvent } from "../admission/journalStore";
import type { BranchReadinessScorecard, MergeBlockedReport } from "./readinessReport";

export interface PersistReadinessEvaluationArgs {
  journal: JournalStore;
  branch_id: string;
  scorecard: BranchReadinessScorecard;
  merge_blocked_report?: MergeBlockedReport;
  now: string;
  related_sequences?: number[];
}

export async function persistReadinessEvaluation(
  args: PersistReadinessEvaluationArgs,
): Promise<JournalEvent> {
  return args.journal.append({
    event_type: "readiness_evaluated",
    branch_id: args.branch_id,
    admitted_at: args.now,
    readiness_scorecard: args.scorecard,
    merge_blocked_report: args.merge_blocked_report,
    related_sequences: args.related_sequences ?? [],
    details: {
      readiness_status: args.scorecard.status,
      score: args.scorecard.score,
      max_score: args.scorecard.max_score,
    },
  });
}
