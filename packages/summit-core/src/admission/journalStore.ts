import type { AdmissionReceipt } from "./admissionReceipt";
import type { SignedPromotionOverrideReceipt } from "../branching/overrideReceipts";
import type { BranchReadinessScorecard, MergeBlockedReport } from "../review/readinessReport";

export type JournalEventType =
  | "writeset_admitted"
  | "writeset_replayed"
  | "readiness_evaluated"
  | "override_recorded"
  | "branch_promoted"
  | "branch_promotion_blocked";

export interface JournalEvent {
  sequence: number;
  event_type: JournalEventType;
  writeset_id?: string;
  batch_signature?: string;
  branch_id?: string;
  admitted_at: string;
  admission_version?: string;
  validator_hash?: string;

  readiness_scorecard?: BranchReadinessScorecard;
  merge_blocked_report?: MergeBlockedReport;
  override_receipt?: SignedPromotionOverrideReceipt;
  receipt?: AdmissionReceipt;

  related_sequences?: number[];
  details?: Record<string, unknown>;
}

export interface JournalStore {
  append(event: Omit<JournalEvent, "sequence">): Promise<JournalEvent>;
  list(): Promise<JournalEvent[]>;
  nextSequence(): Promise<number>;
  findByBranch(branchId: string): Promise<JournalEvent[]>;
}

export class InMemoryJournalStore implements JournalStore {
  private events: JournalEvent[];

  constructor(seed: JournalEvent[] = []) {
    this.events = [...seed];
  }

  async nextSequence(): Promise<number> {
    return this.events.length + 1;
  }

  async append(event: Omit<JournalEvent, "sequence">): Promise<JournalEvent> {
    const full: JournalEvent = {
      ...event,
      sequence: this.events.length + 1,
    };
    this.events.push(full);
    return full;
  }

  async list(): Promise<JournalEvent[]> {
    return [...this.events];
  }

  async findByBranch(branchId: string): Promise<JournalEvent[]> {
    return this.events.filter((e) => e.branch_id === branchId);
  }
}
