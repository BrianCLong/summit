export enum ForecastType {
  COST_GROWTH = 'COST_GROWTH',
  AGENT_LOAD = 'AGENT_LOAD',
  INCIDENT_LIKELIHOOD = 'INCIDENT_LIKELIHOOD',
  GOVERNANCE_PRESSURE = 'GOVERNANCE_PRESSURE',
}

export enum TimeHorizon {
  DAYS_30 = 30,
  DAYS_90 = 90,
  DAYS_180 = 180,
}

export interface Forecast {
  type: ForecastType;
  horizon: TimeHorizon;
  predictedValue: number;
  confidenceInterval: {
    lower: number;
    upper: number;
  };
  assumptions: string[];
  historicalEvidence: string; // ID or link to data source
}
