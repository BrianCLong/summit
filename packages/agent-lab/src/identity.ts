export interface Principal {
  id: string;
  displayName?: string;
  role?: string;
  source?: string;
}

export interface PrincipalChain {
  human?: Principal;
  agent: Principal;
  runtime: {
    id?: string;
    sessionId?: string;
    hostname?: string;
  };
  request?: {
    correlationId?: string;
    traceId?: string;
    workflowRunId?: string;
    stepName?: string;
  };
}

export interface AttributionStatus {
  complete: boolean;
  missing: string[];
  mode: 'lenient' | 'strict';
}
