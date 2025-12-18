import { beforeEach, describe, expect, it } from 'vitest';
import { MaestroConductor } from '../src/maestro-conductor';
import type {
  AssetDescriptor,
  CiCheck,
  DiscoveryProvider,
  GuardrailHook,
  JobSpec,
  OrchestrationTask,
} from '../src/types';

const safetyGuardrail: GuardrailHook = {
  id: 'safety-label',
  description: 'requires assets to declare safety posture',
  evaluate: ({ asset }) => {
    const safe = asset.labels?.safe === 'true';
    return {
      id: 'safety-label',
      description: 'requires assets to declare safety posture',
      passed: safe,
      severity: safe ? 'info' : 'block',
      reason: safe ? 'asset marked as safe' : 'asset missing safe label',
      recommendations: safe ? [] : ['enable safe label for production traffic'],
      metadata: { labels: asset.labels },
    };
  },
};

const ciGate: CiCheck = {
  id: 'unit-tests',
  description: 'block routing when CI has not completed',
  required: true,
  evaluate: (task) => ({
    id: 'unit-tests',
    passed: task.metadata?.ciStatus === 'passed',
    detail: 'requires passing CI status',
    metadata: { status: task.metadata?.ciStatus },
  }),
};

describe('task orchestration guardrails and tracing', () => {
  let conductor: MaestroConductor;
  let assets: AssetDescriptor[];

  const job: JobSpec = {
    id: 'job-task-1',
    type: 'agent-task',
    priority: 'high',
    requiredCapabilities: ['orchestration'],
    requirements: { regions: ['us-east-1', 'us-west-2'] },
  };

  beforeEach(async () => {
    assets = [
      {
        id: 'svc-primary',
        name: 'Primary Orchestrator',
        kind: 'microservice',
        region: 'us-east-1',
        labels: { compliance: 'soc2', safe: 'false' },
        capabilities: [
          {
            name: 'orchestration',
            description: 'Executes workflow steps',
            qualityOfService: { latencyMs: 90, reliability: 0.999 },
          },
        ],
      },
      {
        id: 'svc-safety',
        name: 'Safety First Orchestrator',
        kind: 'microservice',
        region: 'us-west-2',
        labels: { compliance: 'soc2', safe: 'true' },
        capabilities: [
          {
            name: 'orchestration',
            description: 'Executes workflow steps with safety enabled',
            qualityOfService: { latencyMs: 110, reliability: 0.998 },
          },
        ],
      },
    ];

    conductor = new MaestroConductor({ jobRouter: { latencyWeight: 0.5 } });
    const provider: DiscoveryProvider = {
      id: 'test-provider',
      scan: async () => assets,
    };
    conductor.registerDiscoveryProvider(provider);
    conductor.registerGuardrail(safetyGuardrail);
    conductor.registerCiCheck(ciGate);
    await conductor.scanAssets();
  });

  it('routes tasks with guardrails, tracing, and fallbacks applied', async () => {
    const task: OrchestrationTask = {
      id: 'task-001',
      intent: 'execute-workflow',
      job,
      metadata: { ciStatus: 'passed', owner: 'ai-control-plane' },
    };

    const result = await conductor.executeTask(task);

    expect(result.selected?.assetId).toBe('svc-safety');
    expect(result.fallbacksTried).toContain('svc-primary');
    expect(
      result.guardrails.some(
        (evaluation) => evaluation.blocked && evaluation.decision.assetId === 'svc-primary',
      ),
    ).toBe(true);
    expect(result.trace.entries.some((entry) => entry.step === 'fallback')).toBe(true);
    expect(result.trace.status).toBe('completed');
  });

  it('blocks execution when CI gates fail even if guardrails pass', async () => {
    assets[0].labels = { compliance: 'soc2', safe: 'true' };
    const task: OrchestrationTask = {
      id: 'task-002',
      intent: 'deploy',
      job: {
        id: 'job-task-2',
        type: 'deployment',
        priority: 'normal',
        requiredCapabilities: ['orchestration'],
        requirements: { regions: ['us-east-1'] },
      },
      metadata: { ciStatus: 'failed' },
    };

    const result = await conductor.executeTask(task);

    expect(result.selected).toBeUndefined();
    expect(result.trace.status).toBe('failed');
    expect(result.ciChecks.some((check) => !check.passed)).toBe(true);
  });

  it('records guardrail errors and falls back to healthy assets', async () => {
    const throwingGuardrail: GuardrailHook = {
      id: 'throwing-guardrail',
      description: 'simulates guardrail runtime error',
      evaluate: () => {
        throw new Error('runtime guardrail failure');
      },
    };
    conductor.registerGuardrail(throwingGuardrail);

    const task: OrchestrationTask = {
      id: 'task-003',
      intent: 'execute-workflow',
      job,
      metadata: { ciStatus: 'passed' },
    };

    const result = await conductor.executeTask(task);

    const failedEvaluation = result.guardrails.find(
      (evaluation) => evaluation.decision.assetId === 'svc-primary',
    );
    expect(failedEvaluation?.errors[0]?.error).toContain('runtime guardrail failure');
    expect(result.selected?.assetId).toBe('svc-safety');
    expect(result.trace.entries.some((entry) => entry.step === 'guardrail' && entry.status === 'failed')).toBe(true);
  });

  it('captures failed trace when routing throws before guardrails', async () => {
    const task: OrchestrationTask = {
      id: 'task-004',
      intent: 'deploy',
      job: { ...job, requirements: { regions: ['eu-central-1'] } },
    };

    await expect(conductor.executeTask(task)).rejects.toThrow('no eligible assets found for job');
    const trace = conductor.getExecutionTrace(task.id);
    expect(trace?.status).toBe('failed');
    expect(trace?.entries.some((entry) => entry.step === 'error')).toBe(true);
  });
});
