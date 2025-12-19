import {
  AdapterLifecycleIntent,
  AdapterLifecycleStage,
} from '../contracts/lifecycle';
import type {
  LifecycleGuard,
  LifecycleGuardContext,
  LifecycleGuardDecision,
} from '../contracts/guard';
import type {
  PolicyDecision,
  PolicyEvaluator,
  PolicyPreflightInput,
} from '../contracts/policy';

const DEFAULT_ALLOWED_STAGES: AdapterLifecycleStage[] = [
  AdapterLifecycleStage.Registered,
  AdapterLifecycleStage.Warm,
  AdapterLifecycleStage.Ready,
  AdapterLifecycleStage.Executing,
];

export const DEFAULT_MAX_RETRIES = 3;

export interface LifecycleGuardOptions {
  allowedStages?: AdapterLifecycleStage[];
  maxRetries?: number;
  policyEvaluator?: PolicyEvaluator;
  now?: () => number;
}

export const createLifecycleGuard = (
  options: LifecycleGuardOptions = {},
): LifecycleGuard => {
  const allowedStages = options.allowedStages ?? DEFAULT_ALLOWED_STAGES;
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  const now = options.now ?? Date.now;

  return async (
    intent: AdapterLifecycleIntent,
    context: LifecycleGuardContext,
  ): Promise<LifecycleGuardDecision> => {
    const reasons: string[] = [];

    if (!allowedStages.includes(context.stage)) {
      reasons.push(
        `Stage "${context.stage}" is not allowed for intent "${intent}"`,
      );
    }

    if (context.attempt > maxRetries) {
      reasons.push(
        `Attempt ${context.attempt} exceeds max retries (${maxRetries})`,
      );
    }

    const policy = await runPolicyPreflight(intent, context, {
      evaluate: options.policyEvaluator,
    });
    const allowedByPolicy = policy?.allowed ?? true;
    if (!allowedByPolicy) {
      reasons.push(
        policy?.reason ?? 'Policy preflight denied adapter execution',
      );
    }
    const allowed = reasons.length === 0 && allowedByPolicy;

    return {
      allowed,
      intent,
      stage: context.stage,
      reasons,
      policy,
      timestamp: new Date(now()).toISOString(),
    };
  };
};

export const runPolicyPreflight = async (
  intent: AdapterLifecycleIntent,
  context: LifecycleGuardContext,
  options?: { evaluate?: PolicyEvaluator },
): Promise<PolicyDecision | undefined> => {
  if (!options?.evaluate) {
    return undefined;
  }

  const input: PolicyPreflightInput = {
    intent,
    stage: context.stage,
    adapter: context.adapter,
    attributes: context.attributes ?? context.request.metadata,
    digests: context.request.digests,
  };

  return options.evaluate(input);
};
