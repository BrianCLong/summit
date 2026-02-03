import { createHash } from 'node:crypto';
import { UiPlan } from './schema.js';

export type EvidenceBundle = {
  planHash: string;
  rendererVersion: string;
  promptId: string;
  toolInputs: Record<string, unknown>;
  toolOutputs: Record<string, unknown>;
  generatedAt: string;
};

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, val]) => `"${key}":${stableStringify(val)}`);
    return `{${entries.join(',')}}`;
  }
  return JSON.stringify(value);
}

export function createEvidenceBundle(params: {
  plan: UiPlan;
  rendererVersion: string;
  promptId: string;
  toolInputs: Record<string, unknown>;
  toolOutputs: Record<string, unknown>;
}): EvidenceBundle {
  const planPayload = stableStringify(params.plan);
  const planHash = createHash('sha256').update(planPayload).digest('hex');

  return {
    planHash,
    rendererVersion: params.rendererVersion,
    promptId: params.promptId,
    toolInputs: params.toolInputs,
    toolOutputs: params.toolOutputs,
    generatedAt: new Date().toISOString(),
  };
}
