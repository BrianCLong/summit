export type GateStatus = "pass" | "fail" | "warning" | "unknown";
export interface CommandConsoleSnapshot {
  generatedAt: string;
  gaGate: {
    overall: GateStatus;
    lastRun: string;
    missing?: string[];
    details: Array<{
      component: string;
      status: GateStatus;
      message: string;
    }>;
  };
  ci: {
    branch: string;
    status: GateStatus;
    commit: string;
    url?: string;
    updatedAt: string;
  };
  slo: {
    compliance: number;
    window: string;
    errorBudgetRemaining: number;
    burnRate: number;
  };
  llm: {
    aggregate: {
      tokens: number;
      cost: number;
      window: string;
    };
    tenants: Array<{
      tenantId: string;
      tokens: number;
      cost: number;
      rateLimitStatus: string;
    }>;
  };
  dependencyRisk: {
    level: GateStatus;
    issues: number;
    lastScan: string;
    topRisks: string[];
  };
  evidence: {
    latestBundle: string;
    status: GateStatus;
    artifacts: number;
    lastGeneratedAt: string;
  };
  tenants: Array<{
    tenantId: string;
    active: boolean;
    rateLimit: string;
    ingestionCap: string;
    killSwitch: boolean;
  }>;
  incidents: {
    gaGateFailures: Array<{
      id: string;
      message: string;
      occurredAt: string;
    }>;
    policyDenials: Array<{
      id: string;
      scope: string;
      occurredAt: string;
    }>;
    killSwitchActivations: Array<{
      id: string;
      tenantId: string;
      occurredAt: string;
    }>;
  };
}
