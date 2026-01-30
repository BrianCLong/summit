import {
  evaluatePolicy,
  HookEvent,
  HookPolicyConfig,
  redactSecrets,
} from './policy';

/**
 * Executes hooks after verifying them against the policy.
 */
export async function runHooks(event: HookEvent, config: HookPolicyConfig) {
  const decision = evaluatePolicy(event, config);
  const redactedInput = redactSecrets(event.toolInput);

  if (!decision.allowed) {
    return {
      ran: false,
      reason: decision.reason,
      audit: {
        event: event.tool,
        input: redactedInput,
        decision: 'DENIED',
      },
    };
  }

  // Execution logic for approved commands would go here.
  // In this foundation PR, we only validate the policy and return the decision.
  return {
    ran: true,
    audit: {
      event: event.tool,
      input: redactedInput,
      decision: 'ALLOWED',
    },
  };
}
