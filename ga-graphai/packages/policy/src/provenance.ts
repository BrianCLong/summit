import type { CursorEvent, PolicyDecision } from 'common-types';

export interface PolicyDecisionRecordedEvent {
  type: 'PolicyDecisionRecorded';
  decision: PolicyDecision;
  decision_id: string;
  correlation_id?: string;
  evidence_refs: string[];
  created_at: string;
  source?: string;
  event?: CursorEvent;
}

export type PolicyDecisionProvenanceWriter = (
  event: PolicyDecisionRecordedEvent,
) => Promise<void> | void;

export function emitPolicyDecisionRecorded(
  decision: PolicyDecision,
  writer: PolicyDecisionProvenanceWriter,
  options: { source?: string; event?: CursorEvent } = {},
): Promise<void> | void {
  const event: PolicyDecisionRecordedEvent = {
    type: 'PolicyDecisionRecorded',
    decision,
    decision_id: decision.decision_id,
    correlation_id: decision.correlation_id,
    evidence_refs: decision.evidence_refs ?? [],
    created_at: new Date().toISOString(),
    source: options.source ?? 'policy-service',
    event: options.event,
  };

  return writer(event);
}
