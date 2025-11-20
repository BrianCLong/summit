/**
 * Risk Scoring Types
 */

export interface RiskScore {
  entityId: string;
  score: number;
  probability: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  factors: RiskFactor[];
  timestamp: Date;
}

export interface RiskFactor {
  name: string;
  weight: number;
  value: number;
  contribution: number;
}

export interface Scorecard {
  name: string;
  variables: ScorecardVariable[];
  baseScore: number;
  scalingFactor: number;
}

export interface ScorecardVariable {
  name: string;
  bins: ScoreBin[];
  weight: number;
}

export interface ScoreBin {
  min: number;
  max: number;
  points: number;
  woe: number; // Weight of Evidence
}

export interface PSI {
  variable: string;
  psi: number;
  status: 'stable' | 'warning' | 'unstable';
}
