export type TimeResolution = 'monthly' | 'quarterly' | 'yearly';
export type Domain = 'cost' | 'reliability' | 'autonomy' | 'regulatory' | 'ecosystem';

export interface ScenarioDefinition {
  id: string;
  name: string;
  description: string;
  horizonMonths: number;
  resolution: TimeResolution;
  domains: Domain[];
  initialState: SimulationState;
  parameters: ScenarioParameters;
  events?: ScenarioEvent[];
}

export interface ScenarioParameters {
  growthRate: number; // Monthly growth rate
  regulatoryStrictness: 'low' | 'medium' | 'high';
  autonomyLevel: 'tier1' | 'tier2' | 'tier3';
  baseCostPerTenant: number;
  incidentBaseline: number;
  [key: string]: any;
}

export interface SimulationState {
  timeMonth: number;
  tenantCount: number;
  totalCost: number;
  reliabilityScore: number; // 0-1
  complianceScore: number; // 0-1
  autonomyAdoption: number; // 0-1
  activeRegulation: string[];
  metrics: Record<string, number>;
  violations: InvariantViolation[];
}

export interface ScenarioEvent {
  month: number;
  type: string;
  description: string;
  impact: (state: SimulationState) => Partial<SimulationState>;
}

export interface InvariantViolation {
  month: number;
  rule: string;
  value: number;
  threshold: number;
  message: string;
}

export interface SimulationResult {
  scenarioId: string;
  timeline: SimulationState[];
  aggregateMetrics: {
    totalTCO: number;
    avgReliability: number;
    finalTenantCount: number;
    violationCount: number;
  };
  status: 'success' | 'failed';
}

export interface DomainModel {
  name: Domain;
  apply(state: SimulationState, params: ScenarioParameters, dt: number): SimulationState;
}
