import { AutonomyMode, ExecutionGuardrail, PlanContext, Step } from './types.js';

export type GuardianDecision =
  | { action: 'allow'; note?: string }
  | { action: 'block'; reason: string }
  | { action: 'require_approval'; reason: string }
  | { action: 'downgrade_mode'; mode: AutonomyMode; reason: string }
  | { action: 'redact_output'; reason: string };

export interface GuardianState {
  mode: AutonomyMode;
  runId: string;
  planId: string;
  guardrails?: ExecutionGuardrail[];
  planContext?: PlanContext;
}

export interface PolicyDecisionProvider {
  beforeStep(step: Step, state: GuardianState): Promise<GuardianDecision>;
}

export class AllowAllPolicyDecisionProvider implements PolicyDecisionProvider {
  async beforeStep(): Promise<GuardianDecision> {
    return { action: 'allow' };
  }
}
