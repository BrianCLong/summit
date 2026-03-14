import { test, describe } from 'node:test';
import assert from 'node:assert';
import { CounterSensorNetwork, type CounterSensor } from './model.ts';
import { get_posture_for_community } from './posture_fusion.ts';
import { type ScenarioExecutionRecord } from '../counter_ai/multi_agent_harness.ts';

describe('Posture Fusion', () => {
  const communityNodes = ['n1', 'n2', 'n3'];

  const s1: CounterSensor = {
    sensor_id: 's1',
    backing_assets: [],
    coverage_region: { node_ids: ['n1', 'n2'], relation_types: [] },
    signal_quality: 'HIGH',
    sensor_mode: 'PASSIVE_WATCH',
  };

  const s2: CounterSensor = {
    sensor_id: 's2',
    backing_assets: [],
    coverage_region: { node_ids: ['n2', 'n3'], relation_types: [] },
    signal_quality: 'MEDIUM',
    sensor_mode: 'PASSIVE_WATCH',
  };

  const deceptiveSensor: CounterSensor = {
    sensor_id: 's3_deceptive',
    backing_assets: [],
    coverage_region: { node_ids: ['n1', 'n2', 'n3'], relation_types: [] },
    signal_quality: 'DECEPTIVE',
    sensor_mode: 'PASSIVE_WATCH',
  };

  test('should return GREEN for redundant high/medium coverage and no active risks', () => {
    const network = new CounterSensorNetwork([s1, s2]);
    const harnessRecords: ScenarioExecutionRecord[] = [];

    const posture = get_posture_for_community('comm1', network, harnessRecords, communityNodes);

    assert.strictEqual(posture.composite_rating, 'GREEN');
    assert.strictEqual(posture.sensor_coverage_score, 1.0); // all n1,n2,n3 covered
    assert.strictEqual(posture.sensor_trust_score, 1.0);
    assert.strictEqual(posture.stack_robustness_score, 1.0);
  });

  test('should return AMBER for fragile coverage (no redundancy)', () => {
    const network = new CounterSensorNetwork([s1]);
    const harnessRecords: ScenarioExecutionRecord[] = [];

    const posture = get_posture_for_community('comm1', network, harnessRecords, communityNodes);

    // n1 and n2 only covered by s1. n3 is blind.
    assert.strictEqual(posture.composite_rating, 'AMBER');
    assert.ok(posture.rationale.includes('AMBER'));
  });

  test('should return RED for complete blind spot', () => {
    const network = new CounterSensorNetwork([]);
    const harnessRecords: ScenarioExecutionRecord[] = [];

    const posture = get_posture_for_community('comm1', network, harnessRecords, communityNodes);

    assert.strictEqual(posture.composite_rating, 'RED');
    assert.strictEqual(posture.sensor_coverage_score, 0);
  });

  test('should return RED if critical vulnerabilities exist', () => {
    const network = new CounterSensorNetwork([s1, s2]); // Good coverage
    const harnessRecords: ScenarioExecutionRecord[] = [
      {
        scenario_id: 'PROMPT_JAILBREAK_PROBE',
        timestamp: new Date().toISOString(),
        parameters: {},
        observed_outputs: {},
        triggered_risk_ids: ['RISK-002'],
        severity: 'CRITICAL',
      }
    ];

    const posture = get_posture_for_community('comm1', network, harnessRecords, communityNodes);

    assert.strictEqual(posture.composite_rating, 'RED');
    assert.strictEqual(posture.stack_robustness_score, 0.5); // lowered by 0.5 from 1.0
  });

  test('should return AMBER if coverage is heavily dependent on deceptive sensors', () => {
    const network = new CounterSensorNetwork([deceptiveSensor]);
    const harnessRecords: ScenarioExecutionRecord[] = [];

    const posture = get_posture_for_community('comm1', network, harnessRecords, communityNodes);

    assert.strictEqual(posture.sensor_coverage_score, 1.0);
    assert.strictEqual(posture.sensor_trust_score, 0.6); // 1.0 - 0.4
    assert.strictEqual(posture.composite_rating, 'AMBER');
  });
});
