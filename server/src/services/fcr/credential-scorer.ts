import { FcrSignal } from './types.js';

const C2PA_MULTIPLIERS: Record<string, number> = {
  pass: 1.2,
  fail: 0.6,
  error: 0.8,
  unknown: 1.0,
};

export class FcrCredentialScorer {
  scoreSignal(signal: FcrSignal) {
    const base = signal.confidence_local;
    const status = signal.provenance_assertions?.c2pa_status || 'unknown';
    const multiplier = C2PA_MULTIPLIERS[status] ?? 1.0;
    const score = Math.max(0, Math.min(1, base * multiplier));
    return {
      score,
      multiplier,
      status,
    };
  }
}
