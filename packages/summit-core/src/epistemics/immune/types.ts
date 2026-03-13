import type { Signal } from "../sentinels/signals";

export type ImmuneDecision =
  | { disposition: "allow"; flags?: Signal[] }
  | { disposition: "allow_with_flags"; flags: Signal[] }
  | { disposition: "quarantine"; signals: Signal[]; missing_requirements: Array<{ code: string; message: string }>; recommended_next_evidence: Array<{ hint: string; query?: string }> };
