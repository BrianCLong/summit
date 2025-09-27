import { describe, expect, it } from 'vitest';
import { ExperimentStore } from '../src/store.js';
import type { AnalysisPlan, MetricDefinition, StopRule } from '../src/types.js';
import { buildExportBundle, createExportDigest } from '../src/exporter.js';

const actor = 'qa@prer';
const stopRule: StopRule = { maxDurationDays: 14, maxUnits: 10000 };
const analysisPlan: AnalysisPlan = {
  method: 'difference-in-proportions',
  alpha: 0.05,
  desiredPower: 0.8
};

const metrics: MetricDefinition[] = [
  { name: 'activation_rate', baselineRate: 0.1, minDetectableEffect: 0.02 }
];

describe('ExperimentStore', () => {
  it('rejects hypothesis changes after experiment start and logs audit entries', () => {
    const store = new ExperimentStore();
    const experiment = store.createExperiment(
      {
        name: 'Onboarding funnel',
        hypothesis: 'Shorter form improves activation',
        metrics,
        stopRule,
        analysisPlan
      },
      actor
    );

    store.startExperiment(experiment.id, actor);

    expect(() =>
      store.attemptHypothesisUpdate(
        experiment.id,
        'Different hypothesis',
        'malicious@corp'
      )
    ).toThrowError('Hypothesis changes are locked once the experiment has started.');

    const auditLog = store.getExperiment(experiment.id)!.auditLog;
    const rejection = auditLog.find((entry) => entry.action === 'UPDATE_HYPOTHESIS');
    expect(rejection).toBeDefined();
    expect(rejection?.status).toBe('REJECTED');
    expect(rejection?.actor).toBe('malicious@corp');
  });

  it('blocks ingestion for unregistered metrics', () => {
    const store = new ExperimentStore();
    const experiment = store.createExperiment(
      {
        name: 'Pricing page',
        hypothesis: 'New layout improves conversion',
        metrics,
        stopRule,
        analysisPlan
      },
      actor
    );

    expect(() =>
      store.addResult(experiment.id, 'revenue', { variant: 'B', value: 42 }, actor)
    ).toThrowError('Metric revenue is not registered for this experiment.');
  });

  it('produces exports that can be verified offline', () => {
    const store = new ExperimentStore();
    const experiment = store.createExperiment(
      {
        name: 'Copy test',
        hypothesis: 'Button copy increases clicks',
        metrics,
        stopRule,
        analysisPlan
      },
      actor
    );

    const bundle = buildExportBundle(experiment);
    const offlineDigest = createExportDigest(bundle.payload);
    expect(bundle.digest).toEqual(offlineDigest);
  });
});
