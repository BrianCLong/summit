export interface Trace {
  trace_id: string;
  judge_name: string;
  input: string;
  output?: string;
  label?: string | number; // Human label
  rationale?: string; // Human rationale
  metadata?: Record<string, any>;
  timestamp?: string;
}

export interface FeedbackBatch {
  batch_id: string;
  source: string;
  traces: Trace[];
}
