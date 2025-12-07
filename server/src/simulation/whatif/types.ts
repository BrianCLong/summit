
export enum WhatIfScenarioType {
  POLICY_CHANGE = 'POLICY_CHANGE',
  CONFIG_CHANGE = 'CONFIG_CHANGE',
  DEPLOYMENT_IMPACT = 'DEPLOYMENT_IMPACT',
  INCIDENT_REPLAY = 'INCIDENT_REPLAY',
  STRESS_TEST = 'STRESS_TEST',
}

export enum WhatIfStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export interface WhatIfScenarioConfig {
  id: string;
  name: string;
  type: WhatIfScenarioType;
  description: string;
  createdBy: string;
  createdAt: Date;
  parameters: Record<string, any>;
  trafficSource?: TrafficSource;
}

export interface TrafficSource {
  type: 'LIVE_MIRROR' | 'RECORDED_SESSION' | 'SYNTHETIC' | 'LOG_REPLAY';
  config: {
    sourceId?: string; // e.g., session ID, log file path
    sampleRate?: number; // 0-100
    startTime?: Date;
    endTime?: Date;
    tenantId?: string; // Filter by tenant
  };
}

export interface WhatIfResult {
  scenarioId: string;
  status: WhatIfStatus;
  executionTimeMs: number;
  metrics: WhatIfMetrics;
  riskAssessment: RiskAssessment;
  logs: string[];
  artifacts?: string[]; // URLs or paths to generated reports
}

export interface WhatIfMetrics {
  totalRequests: number;
  errorRate: number;
  latencyP50: number;
  latencyP95: number;
  latencyP99: number;
  costDeltaEstimate: number; // Estimated cost change in USD
  policyViolations: number;
}

export interface RiskAssessment {
  score: number; // 0-100, higher is riskier
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  factors: string[]; // e.g., "Latency regression > 10%", "Security policy violation detected"
  blastRadius: {
    affectedTenants: number;
    affectedServices: string[];
  };
}

export interface SimulationStep {
  name: string;
  execute: (context: any) => Promise<void>;
}
