export type FreshnessRisk = 'low' | 'medium' | 'high';

export type KnowledgeSourceType = 'model' | 'snapshot';

export interface KnowledgeSource {
  id: string;
  type: KnowledgeSourceType;
  knowledgeCutoff: Date;
  validFrom?: Date;
  jurisdictions: string[];
  freshnessRisk: FreshnessRisk;
  metadata?: Record<string, unknown>;
}

export interface RoutingConfig {
  sources: KnowledgeSource[];
  defaultJurisdiction?: string;
}

export interface RoutingQuery {
  id?: string;
  requestedDate: Date;
  jurisdiction?: string;
  riskTolerance?: FreshnessRisk;
}

export interface RouteDecision {
  source: KnowledgeSource;
  reasons: string[];
}

export interface SimulationQuery extends RoutingQuery {
  label?: string;
  expectedSourceId?: string;
}

export interface SimulationResult {
  query: SimulationQuery;
  decision: RouteDecision;
  correct?: boolean;
  mismatchReason?: string;
}

export interface SimulationSummary {
  results: SimulationResult[];
  total: number;
  correct: number;
  incorrect: number;
}

export class RoutingError extends Error {
  constructor(message: string, public readonly context?: Record<string, unknown>) {
    super(message);
    this.name = 'RoutingError';
  }
}
