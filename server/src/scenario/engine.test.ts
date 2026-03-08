import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ScenarioEngine } from './engine.js';
import { ScenarioDefinition, SimulationState } from './types.js';

describe('Cross-Domain Scenario Simulation', () => {
  const engine = new ScenarioEngine();

  const baseState: SimulationState = {
    timeMonth: 0,
    tenantCount: 100,
    totalCost: 0,
    reliabilityScore: 1.0,
    complianceScore: 1.0,
    autonomyAdoption: 0.1,
    activeRegulation: [],
    metrics: {},
    violations: []
  };

  it('should run a Conservative Future (Scenario A)', () => {
    const scenarioA: ScenarioDefinition = {
      id: 'SCN-2025-A',
      name: 'Conservative',
      description: 'Slow growth, high regulation',
      horizonMonths: 24,
      resolution: 'quarterly',
      domains: ['cost', 'reliability', 'autonomy', 'regulatory'],
      initialState: baseState,
      parameters: {
        growthRate: 0.02, // 2% monthly
        regulatoryStrictness: 'high',
        autonomyLevel: 'tier1',
        baseCostPerTenant: 100,
        incidentBaseline: 0.001
      }
    };

    const result = engine.runSimulation(scenarioA);

    assert.strictEqual(result.status, 'success');
    assert.strictEqual(result.timeline.length, 9); // Initial + 8 quarters
    assert.ok(result.aggregateMetrics.totalTCO > 0);
    // Conservative = strict reg = low autonomy adoption
    const finalState = result.timeline[result.timeline.length - 1];
    assert.ok(finalState.autonomyAdoption <= 0.3, 'Autonomy adoption should be capped');
  });

  it('should run an Aggressive Future (Scenario C)', () => {
    const scenarioC: ScenarioDefinition = {
      id: 'SCN-2025-C',
      name: 'Aggressive',
      description: 'High growth, permissive reg',
      horizonMonths: 24,
      resolution: 'quarterly',
      domains: ['cost', 'reliability', 'autonomy', 'regulatory'],
      initialState: baseState,
      parameters: {
        growthRate: 0.05, // 5% monthly
        regulatoryStrictness: 'low',
        autonomyLevel: 'tier3',
        baseCostPerTenant: 100,
        incidentBaseline: 0.001
      }
    };

    const result = engine.runSimulation(scenarioC);

    assert.strictEqual(result.status, 'success');
    // Aggressive = high growth
    const finalState = result.timeline[result.timeline.length - 1];
    assert.ok(finalState.tenantCount > baseState.tenantCount * 2, 'Tenant count should grow significantly');
    assert.ok(finalState.autonomyAdoption > 0.3, 'Autonomy adoption should be high');
  });

  it('should detect invariants', () => {
    // Force a failure
    const scenarioFail: ScenarioDefinition = {
      id: 'SCN-FAIL',
      name: 'Failure Mode',
      description: 'High risk',
      horizonMonths: 12,
      resolution: 'monthly',
      domains: ['cost', 'reliability'],
      initialState: baseState,
      parameters: {
        growthRate: 0.50, // Massive growth
        regulatoryStrictness: 'low',
        autonomyLevel: 'tier3',
        baseCostPerTenant: 100,
        incidentBaseline: 0.1 // High incident rate
      }
    };

    const result = engine.runSimulation(scenarioFail);
    const violations = result.timeline.flatMap(t => t.violations);
    assert.ok(violations.length > 0, 'Should have invariant violations');
  });
});
