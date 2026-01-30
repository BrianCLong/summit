import { describe, expect, it } from 'vitest';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { z } from 'zod';
import {
  ActionContractRegistry,
  ToolRuntime,
  EvidenceBundleWriter,
  PlanIRSchema,
  buildPlanFromRequest,
  replayEvidenceBundle,
  EvidenceBundleManager,
} from '../src/evidence/index.js';
import { LLMRequest } from '../src/types/index.js';

const fixedNow = () => new Date('2026-01-15T00:00:00Z');

describe('Plan IR', () => {
  it('serializes and validates', () => {
    const request: LLMRequest = {
      messages: [{ role: 'user', content: 'Summarize the briefing.' }],
      model: 'gpt-4o',
    };
    const plan = buildPlanFromRequest(request, {
      runId: 'run-1',
      planId: 'plan-1',
      goal: 'Summarize the briefing.',
    });

    expect(PlanIRSchema.parse(plan)).toEqual(plan);
  });
});

describe('Action contracts', () => {
  it('validates args and postconditions', async () => {
    const registry = new ActionContractRegistry();
    registry.register({
      toolName: 'math.add',
      argsSchema: z.object({ a: z.number(), b: z.number() }),
      outputSchema: z.object({ sum: z.number() }),
      postcondition: (result) => ({ ok: result.sum >= 0, issues: ['sum negative'] }),
      redactionRules: [{ path: 'a' }],
    });

    const runtime = new ToolRuntime(registry, { strictPostconditions: false });
    runtime.registerHandler('math.add', (args) => ({ sum: (args as { a: number; b: number }).a + (args as { a: number; b: number }).b }));

    const result = await runtime.runTool('math.add', { a: 2, b: 3 }, { runId: 'run-1' });
    expect(result.success).toBe(true);

    const invalid = await runtime.runTool('math.add', { a: 'nope' }, { runId: 'run-1' });
    expect(invalid.success).toBe(false);

    const postcondition = await runtime.runTool('math.add', { a: -2, b: -3 }, { runId: 'run-1' });
    expect(postcondition.success).toBe(true);
    expect(postcondition.postconditionIssues).toContain('sum negative');
  });
});

describe('Evidence bundle', () => {
  it('writes stable manifests', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'evidence-test-'));
    const request: LLMRequest = {
      messages: [{ role: 'user', content: 'Plan test.' }],
      model: 'gpt-4o',
    };
    const plan = buildPlanFromRequest(request, {
      runId: 'run-1',
      planId: 'plan-1',
      goal: 'Plan test.',
    });

    const writerA = new EvidenceBundleWriter(plan, {
      bundlesDir: tempDir,
      now: fixedNow,
      bundleId: 'bundle-a',
    });
    await writerA.initialize();
    await writerA.record({
      type: 'step:started',
      timestamp: fixedNow().toISOString(),
      run_id: 'run-1',
      step_id: 'step-1',
    });
    await writerA.finalize();

    const writerB = new EvidenceBundleWriter(plan, {
      bundlesDir: tempDir,
      now: fixedNow,
      bundleId: 'bundle-b',
    });
    await writerB.initialize();
    await writerB.record({
      type: 'step:started',
      timestamp: fixedNow().toISOString(),
      run_id: 'run-1',
      step_id: 'step-1',
    });
    await writerB.finalize();

    const manifestA = await fs.readFile(path.join(tempDir, 'bundle-a', 'manifest.json'), 'utf8');
    const manifestB = await fs.readFile(path.join(tempDir, 'bundle-b', 'manifest.json'), 'utf8');

    expect(manifestA).toEqual(manifestB);
  });

  it('replays a sample workflow deterministically', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'evidence-replay-'));
    const plan = PlanIRSchema.parse({
      plan_id: 'plan-replay',
      run_id: 'run-replay',
      goal: 'Test replay workflow.',
      steps: [
        {
          step_id: 'step-tool',
          name: 'Tool step',
          tool_name: 'tool.echo',
          args_schema_ref: 'tool.echo.v1',
          preconditions: [],
          postconditions: [],
          permissions: [],
        },
      ],
    });

    const registry = new ActionContractRegistry();
    registry.register({
      toolName: 'tool.echo',
      argsSchema: z.object({ message: z.string() }),
      outputSchema: z.object({ echoed: z.string() }),
      redactionRules: [{ path: 'message' }],
    });

    const runtime = new ToolRuntime(registry);
    runtime.registerHandler('tool.echo', (args) => ({ echoed: (args as { message: string }).message }));

    const manager = new EvidenceBundleManager({ bundlesDir: tempDir, now: fixedNow });
    await manager.createBundle(plan, plan.run_id);

    const recorder = manager.getBundle(plan.run_id);
    await recorder?.record({
      type: 'step:started',
      timestamp: fixedNow().toISOString(),
      run_id: plan.run_id,
      step_id: 'step-tool',
      tool_name: 'tool.echo',
    });

    await runtime.runTool('tool.echo', { message: 'hello' }, {
      runId: plan.run_id,
      planId: plan.plan_id,
      stepId: 'step-tool',
      recorder,
    });

    await recorder?.record({
      type: 'step:completed',
      timestamp: fixedNow().toISOString(),
      run_id: plan.run_id,
      step_id: 'step-tool',
    });

    await manager.finalize(plan.run_id, 'completed');

    const bundlePath = path.join(tempDir, `${plan.run_id}-${plan.plan_id}`);
    const report = await replayEvidenceBundle({ bundlePath, strict: true, contractRegistry: registry });

    expect(report.ok).toBe(true);
  });
});
