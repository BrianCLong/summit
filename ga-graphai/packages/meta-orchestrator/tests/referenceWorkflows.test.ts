import { describe, expect, it } from 'vitest';
import {
  runHelloCaseWorkflow,
  runHelloWorldWorkflow,
  type ReferenceWorkflowResult,
} from '../src/index.js';

describe('reference workflows', () => {
  it('executes the Hello-World path end-to-end with IntelGraph context', async () => {
    const result = await runHelloWorldWorkflow();

    expect(result.plan.pipelineId).toBe('pipeline-hello-world');
    expect(result.outcome.trace[0]?.status).toBe('success');
    expect(result.telemetry.auditCompleteness).toBeCloseTo(1);
    expect(result.graphSnapshot.nodes.some((node) => node.id === 'service:svc-hello-world')).toBe(
      true,
    );
    expect(result.serviceContext?.pipelines?.[0]?.id).toBe('pipeline-hello-world');
    expect(result.auditTrail.some((entry) => entry.category === 'plan')).toBe(true);
  });

  it('invokes fallback logic for Hello-Case and propagates risk signals', async () => {
    const result = await runHelloCaseWorkflow();

    const recovered = result.outcome.trace.find((entry) => entry.status === 'recovered');
    expect(recovered?.provider).toBe('aws');
    expect(result.telemetry.selfHealingRate).toBeGreaterThan(0);
    expect(result.serviceContext?.incidents?.length).toBeGreaterThan(0);
    expect(result.graphSnapshot.serviceRisk['svc-hello-case'].score).toBeGreaterThan(0.3);
    expect(result.auditTrail.some((entry) => entry.category === 'fallback')).toBe(true);
  });

  it('sustains the Hello-Case load profile across repeated orchestrations', async () => {
    const iterations: ReferenceWorkflowResult[] = await Promise.all(
      Array.from({ length: 3 }, () => runHelloCaseWorkflow()),
    );

    const recoveredCounts = iterations.map((iteration) =>
      iteration.outcome.trace.filter((entry) => entry.status === 'recovered').length,
    );
    recoveredCounts.forEach((count) => expect(count).toBeGreaterThan(0));

    const averageThroughput =
      iterations.reduce((acc, iteration) => acc + iteration.telemetry.throughputPerMinute, 0) /
      iterations.length;
    expect(averageThroughput).toBeGreaterThan(40);
  });
});
