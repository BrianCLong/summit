import { describe, expect, it, beforeEach } from 'vitest';
import type { JobSpec } from '../src/types';
import type { MaestroConductor } from '../src/maestro-conductor';
import {
  loadGoldenMaestro,
  type GoldenMaestroScenario,
} from '../../../../scripts/testing/load-golden-maestro.js';

describe('MaestroConductor meta-agent', () => {
  let conductor: MaestroConductor;
  let scenario: GoldenMaestroScenario;
  let executionLog: string[];
  let jobs: JobSpec[];

  beforeEach(async () => {
    const loaded = await loadGoldenMaestro({ scenario: 'control-loop' });
    // Control-loop scenario mirrors the hub-and-spoke orchestration path.
    conductor = loaded.conductor;
    scenario = loaded.scenario;
    executionLog = loaded.executionLog;
    jobs = loaded.jobs;
  });

  it('links discovery, anomaly defence, optimisation, and routing into a unified control loop', async () => {
    expect(conductor.listAssets()).toHaveLength(scenario.assets.length);

    const incidents = conductor.getIncidents();
    expect(incidents.length).toBeGreaterThan(0);
    const actionable = incidents.find((incident) => incident.plans.length > 0);
    expect(actionable?.plans[0].actions[0].type).toBe('failover');
    expect(executionLog).toContain('svc-alpha->svc-beta:auto-fallback');

    const recommendations = conductor.getOptimizationRecommendations();
    const alphaRecommendation = recommendations.find(
      (rec) => rec.assetId === 'svc-alpha',
    );
    expect(alphaRecommendation).toBeDefined();
    expect(alphaRecommendation?.actions).toContain('scale-out');

    const job: JobSpec = jobs[0];

    const plan = await conductor.routeJob(job);
    expect(plan.primary.assetId).toBe('svc-alpha');
    expect(
      plan.primary.reasoning.some((reason) => reason.includes('policy')),
    ).toBe(true);
    expect(plan.fallbacks.length).toBeLessThanOrEqual(1);
  });
});
