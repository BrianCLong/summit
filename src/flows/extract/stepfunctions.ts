import fs from 'node:fs';
import type { FlowEdge } from '../types';

interface WorkflowObservation {
  workflow: string;
  expectedFinalEvent: string;
  observedFinalEvent: string;
  source: string;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function getNestedString(record: Record<string, unknown>, path: string[]): string | undefined {
  let current: unknown = record;
  for (const segment of path) {
    current = asRecord(current)[segment];
  }

  return typeof current === 'string' && current.trim() ? current.trim() : undefined;
}

function parseExpectedFinalEvent(definition: Record<string, unknown>): string {
  const fromMeta = getNestedString(definition, ['metadata', 'expectedFinalEvent']);
  if (fromMeta) {
    return fromMeta;
  }

  const fromCommentRaw = definition.Comment;
  const fromComment = typeof fromCommentRaw === 'string' ? fromCommentRaw : '';
  const match = fromComment.match(/expectedFinalEvent\s*[:=]\s*([A-Za-z0-9_.-]+)/i);
  if (match) {
    return match[1];
  }

  return 'unknown';
}

function extractObservedFinalEventFromState(state: Record<string, unknown>): string {
  const direct = getNestedString(state, ['Parameters', 'EventName']);
  if (direct) {
    return direct;
  }

  const fromResult = getNestedString(state, ['Result', 'eventName']);
  return fromResult ?? 'unknown';
}

export function inspectStepFunctionWorkflow(filePath: string): WorkflowObservation[] {
  const raw = fs.readFileSync(filePath, 'utf8');
  const definition = JSON.parse(raw) as Record<string, unknown>;

  const states = asRecord(definition.States);
  if (Object.keys(states).length === 0) {
    return [];
  }

  const expectedFinalEvent = parseExpectedFinalEvent(definition);
  const observations: WorkflowObservation[] = [];

  for (const [stateName, stateDefRaw] of Object.entries(states)) {
    const stateDef = asRecord(stateDefRaw);
    if (stateDef.End !== true) {
      continue;
    }

    const workflowName =
      (typeof definition.Comment === 'string' && definition.Comment) ||
      (typeof definition.StartAt === 'string' && definition.StartAt) ||
      stateName;

    observations.push({
      workflow: workflowName,
      expectedFinalEvent,
      observedFinalEvent: extractObservedFinalEventFromState(stateDef),
      source: filePath,
    });
  }

  return observations;
}

export function stepFunctionEdges(filePath: string): FlowEdge[] {
  const observations = inspectStepFunctionWorkflow(filePath);

  return observations.map((observation, index) => ({
    id: `FLOWEDGE:workflow-${index + 1}`,
    from: `Workflow ${observation.workflow}`,
    to: `Event ${observation.observedFinalEvent}`,
    kind: 'workflow',
    evidence: [filePath],
    confidence: observation.observedFinalEvent === 'unknown' ? 'low' : 'high',
  }));
}
