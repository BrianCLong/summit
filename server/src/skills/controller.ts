import { z } from 'zod';
import type { SkillContext, SkillId, SkillResult } from './abi.js';
import { SkillSchemas } from './abi.js';
import { defaultSkillRegistry, type SkillRegistry } from './registry.js';
import { assertSkillAllowed } from './policy.js';
import { buildAuditEvent, LoggingAuditSink, type AuditSink } from './events.js';
import { withSpan } from './tracing.js';

export interface ControllerInput {
  goal: string;
  initialState?: Record<string, unknown>;
  constraints?: Record<string, unknown>;
  ctx: SkillContext;
}

export interface ControllerDecision {
  nextSkillId?: SkillId;
  skillInput?: unknown;
  stop?: boolean;
  rationale?: string;
}

export interface Controller {
  decide(
    state: Record<string, unknown>,
    history: ExecutionHistory[],
    ctx: SkillContext,
  ): Promise<ControllerDecision>;
}

export interface ExecutionHistory {
  decision: ControllerDecision;
  result?: SkillResult;
  startedAt: string;
  endedAt?: string;
  durationMs?: number;
}

export interface ControllerRunResult {
  status: 'success' | 'failed' | 'aborted';
  history: ExecutionHistory[];
  finalState: Record<string, unknown>;
  metrics: {
    steps: number;
    toolCalls: number;
    durationMs: number;
  };
  termination: {
    reason: string;
    when: string;
  };
}

const controllerInputSchema = z.object({
  goal: z.string(),
  initialState: z.record(z.unknown()).optional(),
  constraints: z.record(z.unknown()).optional(),
  ctx: SkillSchemas.skillContext,
});

function enforceBudget(
  ctx: SkillContext,
  steps: number,
  toolCalls: number,
  startedAt: number,
): { exceeded: boolean; reason?: string } {
  const now = Date.now();
  if (now - startedAt > ctx.budget.maxMillis) {
    return { exceeded: true, reason: 'budget_exceeded_time' };
  }
  if (steps >= ctx.budget.maxSteps) {
    return { exceeded: true, reason: 'budget_exceeded_steps' };
  }
  if (toolCalls > ctx.budget.maxToolCalls) {
    return { exceeded: true, reason: 'budget_exceeded_tool_calls' };
  }
  return { exceeded: false };
}

export async function runController(
  controller: Controller,
  input: ControllerInput,
  options: {
    registry?: SkillRegistry;
    auditSink?: AuditSink;
  } = {},
): Promise<ControllerRunResult> {
  const parsedInput = controllerInputSchema.parse(input);
  const registry = options.registry ?? defaultSkillRegistry;
  const auditSink: AuditSink = options.auditSink ?? new LoggingAuditSink();

  const ctx = parsedInput.ctx;
  const state: Record<string, unknown> = { ...(parsedInput.initialState ?? {}), goal: parsedInput.goal };
  const history: ExecutionHistory[] = [];
  const startedAt = Date.now();
  let steps = 0;
  let toolCalls = 0;

  while (true) {
    const budgetState = enforceBudget(ctx, steps, toolCalls, startedAt);
    if (budgetState.exceeded) {
      const termination = { reason: budgetState.reason as string, when: new Date().toISOString() };
      auditSink.emit(
        buildAuditEvent('controller.terminated', ctx, { terminationReason: termination.reason, status: 'aborted' }),
      );
      return {
        status: 'aborted',
        history,
        finalState: state,
        metrics: {
          steps,
          toolCalls,
          durationMs: Date.now() - startedAt,
        },
        termination,
      };
    }

    const decisionSpan = await withSpan('controller.decide', () => controller.decide(state, history, ctx), {
      goal: parsedInput.goal,
      step: steps,
    });
    const decision = decisionSpan.result;
    auditSink.emit(buildAuditEvent('controller.decision', ctx, { decision: redactDecision(decision) }));

    if (decision.stop) {
      const termination = {
        reason: decision.rationale ?? 'controller_stop',
        when: new Date().toISOString(),
      };
      auditSink.emit(
        buildAuditEvent('controller.terminated', ctx, {
          terminationReason: termination.reason,
          rationale: decision.rationale,
          status: 'success',
        }),
      );
      return {
        status: 'success',
        history,
        finalState: state,
        metrics: {
          steps,
          toolCalls,
          durationMs: Date.now() - startedAt,
        },
        termination,
      };
    }

    const skillId = decision.nextSkillId;
    if (!skillId) {
      const termination = { reason: 'skill_not_found', when: new Date().toISOString() };
      auditSink.emit(
        buildAuditEvent('controller.terminated', ctx, {
          terminationReason: termination.reason,
          status: 'failed',
        }),
      );
      return {
        status: 'failed',
        history,
        finalState: state,
        metrics: {
          steps,
          toolCalls,
          durationMs: Date.now() - startedAt,
        },
        termination,
      };
    }

    const skill = registry.getSkill(skillId);
    if (!skill) {
      const termination = { reason: 'skill_not_found', when: new Date().toISOString() };
      auditSink.emit(
        buildAuditEvent('skill.denied', ctx, { terminationReason: termination.reason }, skillId),
      );
      return {
        status: 'failed',
        history,
        finalState: state,
        metrics: {
          steps,
          toolCalls,
          durationMs: Date.now() - startedAt,
        },
        termination,
      };
    }

    const policyDecision = assertSkillAllowed(skill.spec, ctx);
    if (!policyDecision.allowed) {
      const termination = { reason: 'policy_denied', when: new Date().toISOString() };
      auditSink.emit(
        buildAuditEvent(
          'skill.denied',
          ctx,
          {
            terminationReason: termination.reason,
            rationale: policyDecision.reason,
          },
          skillId,
        ),
      );
      return {
        status: 'aborted',
        history,
        finalState: state,
        metrics: {
          steps,
          toolCalls,
          durationMs: Date.now() - startedAt,
        },
        termination,
      };
    }

    const inputValidation = skill.spec.inputsSchema.safeParse(decision.skillInput ?? {});
    if (!inputValidation.success) {
      const termination = { reason: 'invalid_input', when: new Date().toISOString() };
      auditSink.emit(
        buildAuditEvent(
          'skill.denied',
          ctx,
          {
            terminationReason: termination.reason,
            rationale: inputValidation.error.message,
          },
          skillId,
        ),
      );
      return {
        status: 'aborted',
        history,
        finalState: state,
        metrics: {
          steps,
          toolCalls,
          durationMs: Date.now() - startedAt,
        },
        termination,
      };
    }

    const started = new Date().toISOString();
    auditSink.emit(buildAuditEvent('skill.start', ctx, { decision: redactDecision(decision) }, skillId));

    const skillSpan = await withSpan(
      `skill.run.${skillId}`,
      () => skill.impl.run(inputValidation.data, ctx, {}),
      { skillId },
    );

    const endedAt = new Date().toISOString();
    const result = skillSpan.result;
    history.push({ decision, result, startedAt: started, endedAt, durationMs: skillSpan.durationMs });
    auditSink.emit(
      buildAuditEvent(
        'skill.end',
        ctx,
        {
          status: result.status,
          terminationReason: result.termination.reason,
          metrics: result.metrics,
        },
        skillId,
      ),
    );

    steps += 1;
    toolCalls += result.metrics.toolCalls;
    Object.assign(state, result.stateDelta ?? {});

    if (result.status !== 'success') {
      const termination = { reason: result.termination.reason, when: endedAt };
      auditSink.emit(
        buildAuditEvent('controller.terminated', ctx, {
          terminationReason: termination.reason,
          status: result.status,
        }),
      );
      return {
        status: result.status,
        history,
        finalState: state,
        metrics: {
          steps,
          toolCalls,
          durationMs: Date.now() - startedAt,
        },
        termination,
      };
    }
  }
}

function redactDecision(decision: ControllerDecision): Pick<ControllerDecision, 'nextSkillId' | 'stop' | 'rationale'> {
  return {
    nextSkillId: decision.nextSkillId,
    stop: decision.stop,
    rationale: decision.rationale,
  };
}
