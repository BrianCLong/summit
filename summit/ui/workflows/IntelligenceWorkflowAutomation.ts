import type { InsightRecord } from '../insights/InsightFeed';
import type { InvestigationMemoryRecord } from '../memory/InvestigationMemory';

export interface WorkflowEvent {
  type:
    | 'anomaly-detected'
    | 'entity-created'
    | 'event-created'
    | 'agent-result-received';
  payload: Record<string, unknown>;
}

export interface WorkflowOutcome {
  action: 'generate-insight' | 'suggest-investigation' | 'update-narrative' | 'update-memory';
  detail: string;
}

export function automateIntelligenceWorkflow(
  event: WorkflowEvent,
  memory: InvestigationMemoryRecord,
): WorkflowOutcome {
  if (event.type === 'anomaly-detected') {
    return { action: 'generate-insight', detail: 'Created insight lead from anomaly pattern.' };
  }
  if (event.type === 'entity-created') {
    return { action: 'suggest-investigation', detail: 'Suggested investigation based on new entity context.' };
  }
  if (event.type === 'event-created') {
    return { action: 'update-narrative', detail: 'Narrative timeline queued for update.' };
  }

  return {
    action: 'update-memory',
    detail: `Investigation memory ${memory.investigationId} updated with latest agent result.`,
  };
}

export function seedInsightFromWorkflow(outcome: WorkflowOutcome): InsightRecord {
  return {
    id: `insight-${outcome.action}`,
    title: outcome.action,
    severity: 'medium',
    sourceEngine: 'evolution-intelligence',
    summary: outcome.detail,
  };
}
