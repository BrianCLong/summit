import { createHash } from 'crypto';

import type {
  NarrativeFrameInput,
  NarrativeInfrastructureInput,
} from './schema.js';

const normalizeText = (value?: string): string =>
  value?.trim().toLowerCase().replace(/\s+/g, ' ') ?? '';

const normalizeList = (values: string[]): string[] =>
  values
    .map((value) => normalizeText(value))
    .filter((value) => value.length > 0)
    .sort();

const stableStringify = (value: unknown): string => {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(
      ([left], [right]) => left.localeCompare(right),
    );
    return `{${entries
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`)
      .join(',')}}`;
  }

  return JSON.stringify(value);
};

const hashPayload = (payload: unknown): string =>
  createHash('sha256').update(stableStringify(payload)).digest('hex');

export const createNarrativeFrameId = (input: NarrativeFrameInput): string => {
  const normalized = {
    blame_target: normalizeText(input.blame_target),
    inevitability: input.inevitability ?? null,
    solution_constraints: normalizeList(input.solution_constraints),
    moral_vocab: normalizeList(input.moral_vocab),
    causal_template: normalizeText(input.causal_template),
  };

  return `frame_${hashPayload(normalized).slice(0, 16)}`;
};

export const createInfrastructureFingerprint = (
  causalTemplate: string,
  moralVocab: string[],
): string => {
  const normalized = {
    causal_template: normalizeText(causalTemplate),
    moral_vocab: normalizeList(moralVocab),
  };

  return `infra_fp_${hashPayload(normalized).slice(0, 16)}`;
};

export const createNarrativeInfrastructureId = (
  input: NarrativeInfrastructureInput,
): string => {
  const normalized = {
    template_fingerprint: normalizeText(input.template_fingerprint),
    frame_ids: [...input.frame_ids].sort(),
    topics_observed: normalizeList(input.topics_observed),
  };

  return `infra_${hashPayload(normalized).slice(0, 16)}`;
};
