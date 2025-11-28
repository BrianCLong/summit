
import { SignalType } from '../signals/types';

export interface SLODefinition {
  id: string;
  name: string;
  targetType: SignalType;
  targetValue: number; // e.g., 99.9 for success rate, 500 for latency
  comparator: '<' | '>' | '<=' | '>=';
  window: '5m' | '1h' | '24h';
  errorBudgetStartingPoints: number; // e.g., 1000 points
  burnRatePerViolation: number; // e.g., 1 point per failure
}

export interface SLAContract {
  id: string;
  tenantId: string;
  slos: SLODefinition[];
  tiers: 'BRONZE' | 'SILVER' | 'GOLD';
}

export interface ErrorBudget {
  sloId: string;
  remainingPoints: number;
  totalPoints: number;
  status: 'HEALTHY' | 'WARNING' | 'EXHAUSTED';
  lastBurnTimestamp?: Date;
}

export enum SLOAlertLevel {
  WARNING = 'WARNING',
  BREACH = 'BREACH',
  BUDGET_EXHAUSTED = 'BUDGET_EXHAUSTED',
}

export interface SLOAlert {
  id: string;
  sloId: string;
  level: SLOAlertLevel;
  message: string;
  timestamp: Date;
  metadata: Record<string, any>;
}
