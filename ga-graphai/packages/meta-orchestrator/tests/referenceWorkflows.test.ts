import { describe, expect, it } from 'vitest';
import {
  runHelloCaseWorkflow,
  runHelloWorldWorkflow,
  type ReferenceWorkflowResult,
} from '../src/index.js';

function expectGraphConnectivity(result: ReferenceWorkflowResult, stageId: string) {
  expect(result.graphSnapshot.nodes.find((node) => node.id === `stage:${stageId}`)).toBeDefined();
  expect(
    result.graphSnapshot.edges.find(
      (edge) => edge.id === `pipeline:${result.plan.pipelineId}:CONTAINS:stage:${stageId}`,
    ),
  ).toBeDefined();
}

describe('reference workflows', () => {
  it('runs the Hello-World workflow through orchestrator and IntelGraph', async () => {
    const result = await runHelloWorldWorkflow();

    expectGraphConnectivity(result, 'hello-world-stage');
    expect(result.plan.steps[0].primary.provider).toBe('azure');
    expect(result.outcome.trace[0].status).toBe('success');
    expect(result.telemetry.throughputPerMinute).toBeGreaterThan(0);
    expect(result.auditTrail.some((entry) => entry.category === 'plan')).toBe(true);
    expect(result.auditTrail.some((entry) => entry.category === 'execution')).toBe(true);
  });

  it('runs the Hello-Case workflow and exercises fallback plus risk scoring', async () => {
    const result = await runHelloCaseWorkflow();

    expectGraphConnectivity(result, 'hello-case-triage');
    expect(result.plan.steps[0].fallbacks).not.toHaveLength(0);
    expect(result.outcome.trace[0].status).toBe('recovered');
    expect(result.outcome.trace[0].provider).toBe('aws');
    expect(result.telemetry.selfHealingRate).toBeGreaterThan(0);

    const serviceRisk = result.graphSnapshot.serviceRisk['service-hello-case'];
    expect(serviceRisk.score).toBeGreaterThan(0.3);
    expect(result.auditTrail.some((entry) => entry.category === 'fallback')).toBe(true);
    expect(result.auditTrail.some((entry) => entry.category === 'reward-update')).toBe(true);
  });
});
