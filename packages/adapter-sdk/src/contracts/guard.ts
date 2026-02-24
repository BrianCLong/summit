import type { AdapterDescriptor, AdapterRequest } from './adapter';
import { AdapterLifecycleIntent, AdapterLifecycleStage } from './lifecycle';
import type { PolicyDecision } from './policy';

export interface LifecycleGuardContext {
  adapter: AdapterDescriptor;
  request: AdapterRequest;
  attempt: number;
  maxRetries: number;
  stage: AdapterLifecycleStage;
  attributes?: Record<string, unknown>;
}

export interface LifecycleGuardDecision {
  allowed: boolean;
  intent: AdapterLifecycleIntent;
  stage: AdapterLifecycleStage;
  reasons: string[];
  policy?: PolicyDecision;
  timestamp: string;
}

export type LifecycleGuard = (
  intent: AdapterLifecycleIntent,
  context: LifecycleGuardContext,
) => Promise<LifecycleGuardDecision>;
