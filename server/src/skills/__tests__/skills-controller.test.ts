import { describe, expect, test } from '@jest/globals';
import { z } from 'zod';
import {
  assertSkillAllowed,
  echoSkill,
  echoSkillSpec,
  InMemoryAuditSink,
  runController,
  SingleSkillThenStopController,
  SkillRegistry,
} from '../index.js';
import type { Controller, ControllerDecision, ExecutionHistory } from '../controller.js';
import type { Skill, SkillContext, SkillResult, SkillSpec } from '../abi.js';

function createContext(overrides: Partial<SkillContext['budget']> = {}): SkillContext {
  return {
    tenantId: 't-1',
    actorId: 'user-1',
    traceId: 'trace-1',
    requestId: 'req-1',
    now: new Date().toISOString(),
    budget: {
      maxSteps: 3,
      maxToolCalls: 3,
      maxMillis: 10_000,
      ...overrides,
    },
    policy: {
      classification: 'internal',
      allowedTools: ['echo', 'skills-demo', 'test'],
    },
  };
}

const testSpec: SkillSpec<{ ping: string }, { pong: string }> = {
  id: 'skill.test',
  version: '0.0.1',
  description: 'test',
  inputsSchema: z.object({ ping: z.string() }),
  outputsSchema: z.object({ pong: z.string() }),
  requiredCapabilities: ['test'],
  policyTags: [],
};

const testSkill: Skill<{ ping: string }, { pong: string }> = {
  async run(): Promise<SkillResult<{ pong: string }>> {
    return {
      status: 'success',
      termination: { reason: 'completed', when: new Date().toISOString() },
      artifacts: [],
      citations: [],
      metrics: { steps: 1, toolCalls: 0, durationMs: 1 },
      output: { pong: 'ok' },
    };
  },
};

class LoopController implements Controller {
  constructor(private readonly skillId: string) {}
  async decide(): Promise<ControllerDecision> {
    return { nextSkillId: this.skillId, skillInput: { ping: 'pong' } };
  }
}

class StopAfterOneController implements Controller {
  constructor(private readonly skillId: string) {}
  async decide(
    _state: Record<string, unknown>,
    history: ExecutionHistory[],
  ): Promise<ControllerDecision> {
    if (history.length === 0) {
      return { nextSkillId: this.skillId, skillInput: { ping: 'pong' }, rationale: 'first' };
    }
    return { stop: true, rationale: 'done' };
  }
}

describe('Skill registry', () => {
  test('registers and retrieves skills', () => {
    const registry = new SkillRegistry();
    registry.registerSkill(testSpec, testSkill);
    const registered = registry.getSkill('skill.test');
    expect(registered?.spec.id).toBe('skill.test');
    expect(registry.listSkills()).toHaveLength(1);
  });
});

describe('Policy gate', () => {
  test('denies missing capabilities', () => {
    const decision = assertSkillAllowed(
      testSpec,
      {
        ...createContext(),
        policy: {
          classification: 'internal',
          allowedTools: [],
        },
      },
    );
    expect(decision.allowed).toBe(false);
  });

  test('allows when capabilities are present', () => {
    const decision = assertSkillAllowed(testSpec, createContext());
    expect(decision.allowed).toBe(true);
  });
});

describe('Executor budgets', () => {
  test('enforces maxSteps budget', async () => {
    const registry = new SkillRegistry();
    registry.registerSkill(testSpec, testSkill);
    const result = await runController(
      new LoopController(testSpec.id),
      { goal: 'test', ctx: createContext({ maxSteps: 1 }) },
      { registry, auditSink: new InMemoryAuditSink() },
    );
    expect(result.status).toBe('aborted');
    expect(result.termination.reason).toBe('budget_exceeded_steps');
    expect(result.history).toHaveLength(1);
  });

  test('enforces maxToolCalls budget', async () => {
    const registry = new SkillRegistry();
    const toolHeavySkill: Skill = {
      async run(): Promise<SkillResult> {
        return {
          status: 'success',
          termination: { reason: 'completed', when: new Date().toISOString() },
          artifacts: [],
          citations: [],
          metrics: { steps: 1, toolCalls: 5, durationMs: 1 },
        };
      },
    };
    registry.registerSkill(testSpec, toolHeavySkill);

    const result = await runController(
      new LoopController(testSpec.id),
      { goal: 'test', ctx: createContext({ maxToolCalls: 1 }) },
      { registry, auditSink: new InMemoryAuditSink() },
    );

    expect(result.status).toBe('aborted');
    expect(result.termination.reason).toBe('budget_exceeded_tool_calls');
    expect(result.history).toHaveLength(1);
  });

  test('enforces maxMillis budget', async () => {
    const registry = new SkillRegistry();
    const slowSkill: Skill = {
      async run(): Promise<SkillResult> {
        await new Promise((resolve) => setTimeout(resolve, 20));
        return {
          status: 'success',
          termination: { reason: 'completed', when: new Date().toISOString() },
          artifacts: [],
          citations: [],
          metrics: { steps: 1, toolCalls: 0, durationMs: 20 },
        };
      },
    };
    registry.registerSkill(testSpec, slowSkill);

    const result = await runController(
      new LoopController(testSpec.id),
      { goal: 'test', ctx: createContext({ maxMillis: 5 }) },
      { registry, auditSink: new InMemoryAuditSink() },
    );

    expect(result.status).toBe('aborted');
    expect(result.termination.reason).toBe('budget_exceeded_time');
  });
});

describe('Controller run happy path', () => {
  test('runs demo controller and skill', async () => {
    const registry = new SkillRegistry();
    registry.registerSkill(echoSkillSpec, echoSkill);
    const auditSink = new InMemoryAuditSink();

    const result = await runController(
      new SingleSkillThenStopController(echoSkillSpec.id),
      { goal: 'hello', ctx: createContext() },
      { registry, auditSink },
    );

    expect(result.status).toBe('success');
    expect(result.history).toHaveLength(1);
    expect(result.termination.reason).toBe('goal_satisfied');
    expect(result.finalState.lastEcho).toBe('hello');
    expect(auditSink.events.length).toBeGreaterThanOrEqual(4);
  });
});

describe('Audit event schema', () => {
  test('emits structured events with identifiers', async () => {
    const registry = new SkillRegistry();
    registry.registerSkill(testSpec, testSkill);
    const auditSink = new InMemoryAuditSink();

    await runController(
      new StopAfterOneController(testSpec.id),
      { goal: 'audit', ctx: createContext() },
      { registry, auditSink },
    );

    const eventTypes = auditSink.events.map((e) => e.type);
    expect(eventTypes).toEqual([
      'controller.decision',
      'skill.start',
      'skill.end',
      'controller.decision',
      'controller.terminated',
    ]);
    auditSink.events.forEach((event) => {
      expect(event.tenantId).toBe('t-1');
      expect(event.actorId).toBe('user-1');
      expect(event.traceId).toBe('trace-1');
      expect(event.requestId).toBe('req-1');
      expect(event.timestamp).toBeDefined();
    });
  });
});
