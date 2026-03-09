import { createHash } from 'crypto';
import { TripletState } from './types.js';

export class FusionEngine {
  constructor(private readonly salt = 'triplet-fusion') {}

  compute(state: TripletState): string {
    const payload = JSON.stringify({
      id: state.id,
      drift: state.driftScore,
      resilience: state.resilienceScore,
      forecast: state.resilienceForecast,
      anomalyCount: state.anomalyCount,
      health: state.healthIndex,
      volatility: state.volatilityScore,
      cohesion: state.cohesionScore,
      entropy: state.entropyScore,
      recovery: state.recoveryReadiness,
      antifragility: state.antifragilityIndex,
      assurance: state.assuranceScore,
      lastPhysical: state.lastPhysical?.metrics ?? {},
      lastDigital: state.lastDigital?.stateVector ?? {},
      lastCognitive: state.lastCognitive?.intent ?? 'none',
      provenance: state.provenanceHash,
    });

    return createHash('sha256')
      .update(this.salt)
      .update(payload)
      .digest('base64')
      .slice(0, 16);
  }
}
