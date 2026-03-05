import { createHash } from 'node:crypto';

import {
  enforceIntensity,
  type InvocationContext,
} from '../governance/intensity.ts';
import type { SkillSpec } from '../policy/validate-semantics.ts';

export interface IntensityEvent {
  type: 'INTENSITY_EVALUATED' | 'INTENSITY_DENIED';
  run_id: string;
  task_id: string;
  agent_name: string;
  skill: string;
  intensity: number;
  decision: 'allow' | 'deny';
  reason: string;
  inputs_hash: string;
}

export interface SkillInvocationRequest extends InvocationContext {
  run_id: string;
  task_id: string;
  agent_name: string;
  skill: string;
}

export interface EventSink {
  emit: (event: IntensityEvent) => void;
}

function canonicalJson(input: unknown): string {
  if (input === null || typeof input !== 'object') {
    return JSON.stringify(input);
  }
  if (Array.isArray(input)) {
    return `[${input.map((item) => canonicalJson(item)).join(',')}]`;
  }
  const objectInput = input as Record<string, unknown>;
  return `{${Object.keys(objectInput)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(objectInput[key])}`)
    .join(',')}}`;
}

function hashInputs(payload: Record<string, unknown>): string {
  return createHash('sha256').update(canonicalJson(payload)).digest('hex');
}

export function evaluateIntensityDecision(
  request: SkillInvocationRequest,
  intensity: number,
  skillSpec: SkillSpec,
  sink: EventSink,
): { allow: boolean; events: IntensityEvent[] } {
  const inputs_hash = hashInputs({
    request,
    intensity,
    skillSpec,
  });

  const decision = enforceIntensity(request, intensity, skillSpec);
  const baseEvent: IntensityEvent = {
    type: 'INTENSITY_EVALUATED',
    run_id: request.run_id,
    task_id: request.task_id,
    agent_name: request.agent_name,
    skill: request.skill,
    intensity,
    decision: decision.allow ? 'allow' : 'deny',
    reason: decision.reason,
    inputs_hash,
  };

  const events: IntensityEvent[] = [baseEvent];

  if (!decision.allow) {
    events.push({
      ...baseEvent,
      type: 'INTENSITY_DENIED',
      decision: 'deny',
    });
  }

  for (const event of events) {
    sink.emit(event);
  }

  return {
    allow: decision.allow,
    events,
  };
}
