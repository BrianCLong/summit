import { DriftSignal } from '../drift/types.js';
import { Forecast } from '../forecast/types.js';

export enum PressureCategory {
  SCALE_RISK = 'SCALE_RISK',
  GOVERNANCE_DEBT = 'GOVERNANCE_DEBT',
  MODEL_DECAY = 'MODEL_DECAY',
  COST_EFFICIENCY = 'COST_EFFICIENCY',
}

export interface RoadmapSignal {
  category: PressureCategory;
  score: number; // 0-100, higher is more urgent
  reason: string;
  supportingEvidence: {
    driftSignals: DriftSignal[];
    forecasts: Forecast[];
  };
  suggestedInvestmentArea: string;
}
