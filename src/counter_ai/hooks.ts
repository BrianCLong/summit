export interface RiskObservation {
  risk_surface: string;
  metadata: Record<string, any>;
  timestamp: number;
}

export interface RiskObservationEmitter {
  emit(observation: RiskObservation): void;
  getRecentObservations(limit?: number): RiskObservation[];
}

export class DefaultRiskObservationEmitter implements RiskObservationEmitter {
  private observations: RiskObservation[] = [];
  private readonly maxObservations = 1000;

  emit(observation: RiskObservation): void {
    // In-process log only, no network calls or blocking
    this.observations.push(observation);
    if (this.observations.length > this.maxObservations) {
      this.observations.shift(); // Keep bounded
    }
    // Minimal console trace for debug only (can be removed in prod)
    if (process.env.DEBUG_COUNTER_AI) {
      console.log(`[CounterAI] Risk Observation on ${observation.risk_surface}:`, observation.metadata);
    }
  }

  getRecentObservations(limit: number = 100): RiskObservation[] {
    return this.observations.slice(-limit);
  }
}

// Global default emitter
export const globalRiskEmitter = new DefaultRiskObservationEmitter();

export function emitRiskObservation(risk_surface: string, metadata: Record<string, any> = {}) {
  try {
    globalRiskEmitter.emit({
      risk_surface,
      metadata,
      timestamp: Date.now()
    });
  } catch (err) {
    // Hooks must never block or crash core pipelines
  }
}
