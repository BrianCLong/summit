import { createHash } from 'crypto';

export interface ProvenanceRecord {
  reqId: string;
  step:
    | 'router'
    | 'generator'
    | 'critic'
    | 'evaluator'
    | 'normalizer'
    | 'planner'
    | 'coordinator';
  inputHash: string;
  outputHash: string;
  modelId?: string;
  ckpt?: string;
  promptHash?: string;
  params?: Record<string, unknown>;
  scores?: Record<string, number>;
  policy: {
    retention: string;
    purpose: string;
    licenseClass?: string;
  };
  time: {
    start: string;
    end: string;
  };
  tags?: string[];
}

export type ProvenanceListener = (record: ProvenanceRecord) => void;

const listeners = new Set<ProvenanceListener>();

export function recordProvenance(record: ProvenanceRecord): void {
  const now = new Date();
  const complete: ProvenanceRecord = {
    ...record,
    time: record.time ?? { start: now.toISOString(), end: now.toISOString() },
    inputHash: record.inputHash || hashObject(''),
    outputHash: record.outputHash || hashObject(''),
    policy: record.policy || {
      retention: 'standard-365d',
      purpose: 'engineering',
    },
  };
  for (const l of listeners) {
    try {
      l(complete);
    } catch (err) {
      if (process.env.NODE_ENV !== 'test') {
        console.warn('provenance-listener-error', err);
      }
    }
  }
}

export function onProvenance(listener: ProvenanceListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function hashObject(obj: unknown): string {
  const h = createHash('sha256');
  const serialized = typeof obj === 'string' ? obj : JSON.stringify(obj ?? {});
  h.update(serialized);
  return `sha256:${h.digest('hex')}`;
}

export function signPrompt(prompt: string, modelId: string): string {
  return hashObject(`${modelId}:${prompt}`);
}
