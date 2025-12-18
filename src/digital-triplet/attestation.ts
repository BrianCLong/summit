import { createHash } from 'crypto';
import { LayerSignal, TripletState } from './types.js';

export interface AttestationResult {
  readonly hash: string;
  readonly assurance: number;
}

export class ProvenanceAttestor {
  constructor(private readonly salt = 'triplet-attestation') {}

  attest(tripletId: string, state: TripletState, signals: LayerSignal[]): AttestationResult {
    const normalizedSignals = signals
      .map((signal) => ({
        type: signal.type,
        timestamp: signal.timestamp,
        payload:
          signal.type === 'physical'
            ? signal.metrics
            : signal.type === 'digital'
              ? signal.stateVector
              : { intent: signal.intent, recommendations: signal.recommendations, confidence: signal.confidence },
      }))
      .sort((a, b) => a.timestamp - b.timestamp);

    const chainSeed = state.provenanceHash ?? 'genesis';
    const payload = JSON.stringify({
      tripletId,
      chainSeed,
      fusion: state.fusionSignature,
      resilience: state.resilienceScore,
      forecast: state.resilienceForecast,
      recovery: state.recoveryReadiness,
      volatility: state.volatilityScore,
      normalizedSignals,
    });

    const hash = createHash('sha256').update(this.salt).update(payload).digest('hex').slice(0, 24);
    const assurance = Math.max(
      0,
      Math.min(
        2,
        Number(
          (
            (state.resilienceScore + state.resilienceForecast + state.recoveryReadiness + state.cohesionScore) / 4 -
            state.entropyScore * 0.1 +
            normalizedSignals.length * 0.02
          ).toFixed(4),
        ),
      ),
    );

    return { hash, assurance };
  }
}
