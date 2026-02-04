import { AdapterLifecycleIntent, AdapterLifecycleStage } from './lifecycle.js';

export interface PolicyPreflightInput {
  intent: AdapterLifecycleIntent;
  stage: AdapterLifecycleStage;
  adapter?: {
    name: string;
    version: string;
    owner?: string;
    capabilities?: string[];
  };
  attributes?: Record<string, unknown>;
  digests?: Record<string, string>;
}

export interface PolicyDecision {
  allowed: boolean;
  reason?: string;
  obligations?: string[];
  advisories?: string[];
  metadata?: Record<string, unknown>;
}

export type PolicyEvaluator = (
  input: PolicyPreflightInput,
) => Promise<PolicyDecision> | PolicyDecision;
