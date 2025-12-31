import assert from 'node:assert';
import { test, describe } from 'node:test';
import { DriftGovernanceService } from '../../server/src/stewardship/drift/service.js';
import { ForecastingService } from '../../server/src/stewardship/forecast/service.js';
import { RoadmapEngine } from '../../server/src/stewardship/roadmap/engine.js';
import { DriftType, DriftSeverity } from '../../server/src/stewardship/drift/types.js';

describe('Stewardship Governance Verification', () => {
  test('Drift Detection triggers on threshold crossing', async () => {
    const driftService = new DriftGovernanceService();
    const signals = await driftService.collectDriftSignals();

    // We expect some mock signals from our implementation
    assert.ok(signals.length > 0, 'Should detect mock drift signals');
    const costDrift = signals.find(s => s.type === DriftType.COST);
    assert.ok(costDrift, 'Should detect cost drift');
    assert.strictEqual(costDrift?.severity, DriftSeverity.HIGH);
  });

  test('Forecasts include confidence intervals and assumptions', async () => {
    const forecastService = new ForecastingService();
    const forecasts = await forecastService.generateForecasts();

    assert.ok(forecasts.length > 0);
    forecasts.forEach(f => {
      assert.ok(f.confidenceInterval, 'Forecast must have confidence interval');
      assert.ok(typeof f.confidenceInterval.lower === 'number');
      assert.ok(typeof f.confidenceInterval.upper === 'number');
      assert.ok(f.assumptions.length > 0, 'Forecast must have assumptions');
    });
  });

  test('Roadmap signals reference evidence', async () => {
    const driftService = new DriftGovernanceService();
    const forecastService = new ForecastingService();
    const roadmapEngine = new RoadmapEngine();

    const driftSignals = await driftService.collectDriftSignals();
    const forecasts = await forecastService.generateForecasts();
    const signals = roadmapEngine.generateSignals(driftSignals, forecasts);

    assert.ok(signals.length > 0, 'Should generate roadmap signals');
    signals.forEach(s => {
      assert.ok(s.supportingEvidence, 'Roadmap signal must have supporting evidence');
      assert.ok(
        s.supportingEvidence.driftSignals.length > 0 || s.supportingEvidence.forecasts.length > 0,
        'Evidence must include drift or forecasts'
      );
    });
  });
});
