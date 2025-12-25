// server/src/risk/types.ts

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type RiskWindow = '24h' | '7d' | '30d';

export interface RiskScore {
  id: string;
  tenantId: string;
  entityId: string;
  entityType: string;
  score: number;
  level: RiskLevel;
  window: RiskWindow;
  modelVersion: string;
  rationale?: string;
  createdAt: Date;
  validUntil?: Date;
}

export interface RiskSignal {
  id: string;
  riskScoreId: string;
  type: string;
  source?: string;
  value: number;
  weight: number;
  contributionScore: number;
  description?: string;
  detectedAt?: Date;
}

export interface RiskScoreInput {
  tenantId: string;
  entityId: string;
  entityType: string;
  score: number;
  level: RiskLevel;
  window: RiskWindow;
  modelVersion: string;
  rationale?: string;
  signals: RiskSignalInput[];
}

export interface RiskSignalInput {
  type: string;
  source?: string;
  value: number;
  weight: number;
  contributionScore: number;
  description?: string;
  detectedAt?: Date;
}
