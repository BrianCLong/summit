import { AutonomyMode, Step } from './types.js';

export type GuardianDecision =
  | { action: 'allow'; note?: string }
  | { action: 'block'; reason: string }
  | { action: 'require_approval'; reason: string }
  | { action: 'downgrade_mode'; mode: AutonomyMode; reason: string }
  | { action: 'redact_output'; reason: string };

export interface PolicyDecisionProvider {
  beforeStep(step: Step, state: Record<string, unknown>): Promise<GuardianDecision>;
}

export class AllowAllPolicyDecisionProvider implements PolicyDecisionProvider {
  async beforeStep(): Promise<GuardianDecision> {
    return { action: 'allow' };
  }
}
