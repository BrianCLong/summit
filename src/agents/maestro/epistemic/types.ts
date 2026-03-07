export type EpistemicDecision = 'APPROVE' | 'DEGRADE' | 'BLOCK' | 'ESCALATE';

export interface IntentEvaluateRequest {
  task_id: string;
  teleology_context_id: string;
  subject_ref: string;
  claim_id: string;
  action_type: string;
}

export interface EpistemicMetrics {
  support_score: number;
  epistemic_uncertainty: number;
  independent_source_count: number;
}
