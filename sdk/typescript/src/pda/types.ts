export interface PdaEvent {
  id: string;
  consentId: string;
  declaredPurpose: string;
  endpoint: string;
  endpointPurpose: string;
  streamKind?: string;
  observedAt: string;
  ownerHint?: string;
  metadata?: Record<string, string>;
}

export interface TraceStep {
  description: string;
  evidence: string;
}

export interface Trace {
  eventId: string;
  contractId: string;
  policyId: string;
  verdict: string;
  suppressed: boolean;
  steps: TraceStep[];
  policy: {
    endpointPurpose: string;
    allowedPurposes: string[];
    owners: string[];
    suppressionWindow: number;
    description?: string;
  };
  event: PdaEvent;
}

export interface Verdict {
  drift: boolean;
  suppressed: boolean;
  owner: string;
  reason: string;
  falsePositive: boolean;
  trace: Trace;
}

export interface Alert {
  event: PdaEvent;
  verdict: Verdict;
  raisedAt: string;
}

export interface EndpointPolicy {
  endpointPurpose: string;
  allowedPurposes: string[];
  owners?: string[];
  suppressionWindow?: number;
  description?: string;
}

export interface RuleUpdate {
  contractId: string;
  policy: EndpointPolicy;
  delete?: boolean;
  version?: number;
}

export interface ConsentContract {
  id: string;
  tenant?: string;
  endpointPolicies: Record<string, EndpointPolicy>;
  metadata?: Record<string, string>;
}

export interface HealthResponse {
  status: string;
  time: string;
  fpRate: number;
  contracts: number;
}

