export interface StepTrace {
  id: string;
  tool: string;
  tokens: number;
  cost: number;
  start: number;
  end: number;
}
export interface RunTrace {
  runId: string;
  steps: StepTrace[];
  plan: unknown;
}
export interface StressProfile {
  apiFailureRate: number;
  tokenCap: number;
  policyStrict: boolean;
}
export interface Sanction {
  type: 'rate_limit' | 'proof_required' | 'interstitial';
  value: number | string;
  rationale: string;
}
export interface ReplayResult {
  drift: number;
  costDelta: number;
  sanctions: Sanction[];
}
