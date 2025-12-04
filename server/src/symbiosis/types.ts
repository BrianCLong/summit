export interface ForesightBundle {
  id: string;
  contextParams: Record<string, any>;
  probability: number;
  utility: number;
  reason: string;
  expiresAt: number;
}

export interface BeliefState {
  source: string;
  facts: Record<string, any>;
  confidence: number; // 0.0 to 1.0
  timestamp: number;
}

export interface FusionDiff {
  path: string;
  conflict: {
    sourceA: string;
    valueA: any;
    confidenceA: number;
    sourceB: string;
    valueB: any;
    confidenceB: number;
  };
  resolution: 'pending' | 'resolved_A' | 'resolved_B' | 'blended';
}

export interface EvolutionProposal {
  layer: 'predictor' | 'fusion' | 'memory' | 'orchestrator' | 'meta';
  change: string;
  expectedGain: string;
  status: 'proposed' | 'testing' | 'committed';
}

export interface SymbiosisKPIs {
  prefetchHitRate: number;
  fusionCoherence: number;
  evolutionVelocity: number;
  taskAcceleration: number;
}

export interface InjectionContext {
  foresight: ForesightBundle[];
  beliefs: Record<string, any>;
  proposals: EvolutionProposal[];
  probes: string[];
}

export interface SymbiosisResponse {
  enrichedAnswer: any;
  foresightHit: string;
  fusionSummary: string;
  evolutionProposal: string;
  nextProbes: string;
}
