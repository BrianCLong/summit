import { TripletDefinition, TripletState } from './types.js';

export class TripletRegistry {
  private readonly definitions = new Map<string, TripletDefinition>();
  private readonly states = new Map<string, TripletState>();

  register(definition: TripletDefinition): TripletState {
    this.definitions.set(definition.id, definition);
    const state: TripletState = {
      id: definition.id,
      driftScore: 0,
      resilienceScore: 1,
      resilienceForecast: 1,
      fusionSignature: 'cold-start',
      provenanceHash: 'genesis',
      anomalyCount: 0,
      adversarialFindings: 0,
      intentBudget: 1,
      volatilityScore: 0,
      healthIndex: 1,
      cohesionScore: 0.5,
      entropyScore: 0,
      recoveryReadiness: 0.2,
      antifragilityIndex: 0.4,
      assuranceScore: 0.5,
      lastAuditAt: Date.now(),
    };
    this.states.set(definition.id, state);
    return state;
  }

  getDefinition(id: string): TripletDefinition | undefined {
    return this.definitions.get(id);
  }

  getState(id: string): TripletState | undefined {
    return this.states.get(id);
  }

  updateState(id: string, updater: (state: TripletState) => TripletState): TripletState {
    const current = this.states.get(id);
    if (!current) {
      throw new Error(`Triplet ${id} is not registered`);
    }
    const next = updater(current);
    this.states.set(id, next);
    return next;
  }

  list(): TripletState[] {
    return Array.from(this.states.values());
  }
}
