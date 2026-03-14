import { test, describe } from 'node:test';
import assert from 'node:assert';
import { CounterSensorNetwork } from './model.ts';

describe('CounterSensorNetwork', () => {
  const sensor1: CounterSensor = {
    sensor_id: 's1',
    backing_assets: ['asset1'],
    coverage_region: {
      node_ids: ['n1', 'n2', 'n3'],
      relation_types: ['r1', 'r2'],
    },
    signal_quality: 'HIGH',
    sensor_mode: 'PASSIVE_WATCH',
  };

  const sensor2: CounterSensor = {
    sensor_id: 's2',
    backing_assets: ['asset2'],
    coverage_region: {
      node_ids: ['n2', 'n3', 'n4'],
      relation_types: ['r2', 'r3'],
    },
    signal_quality: 'MEDIUM',
    sensor_mode: 'EARLY_WARNING',
  };

  const deceptiveSensor: CounterSensor = {
    sensor_id: 's3_deceptive',
    backing_assets: ['asset3'],
    coverage_region: {
      node_ids: ['n5'],
      relation_types: ['r4'],
    },
    signal_quality: 'DECEPTIVE',
    sensor_mode: 'POISONING_INDICATOR',
  };

  test('should compute coverage overlap correctly', () => {
    const network = new CounterSensorNetwork([sensor1, sensor2]);
    const overlap = network.getCoverageOverlap('s1', 's2');

    assert.deepStrictEqual(overlap.node_ids.sort(), ['n2', 'n3'].sort());
    assert.deepStrictEqual(overlap.relation_types.sort(), ['r2'].sort());
  });

  test('should return empty overlap for missing sensors', () => {
    const network = new CounterSensorNetwork([sensor1]);
    const overlap = network.getCoverageOverlap('s1', 'nonexistent');

    assert.deepStrictEqual(overlap.node_ids, []);
    assert.deepStrictEqual(overlap.relation_types, []);
  });

  test('should identify blind spots ignoring deceptive sensors', () => {
    const network = new CounterSensorNetwork([sensor1, sensor2, deceptiveSensor]);
    const targetNodes = ['n1', 'n2', 'n3', 'n4', 'n5', 'n6'];
    const targetRelations = ['r1', 'r2', 'r3', 'r4', 'r5'];

    const blindSpots = network.identifyBlindSpots(targetNodes, targetRelations);

    // n5 is covered by deceptive sensor, so it is still a blind spot in valid coverage
    assert.deepStrictEqual(blindSpots.node_ids.sort(), ['n5', 'n6'].sort());
    // r4 is only covered by deceptive sensor, so it is a blind spot
    assert.deepStrictEqual(blindSpots.relation_types.sort(), ['r4', 'r5'].sort());
  });

  test('should identify fragile coverage', () => {
    const network = new CounterSensorNetwork([sensor1, sensor2]);
    const fragile = network.identifyFragileCoverage();

    // n1 is only in s1. n4 is only in s2.
    assert.deepStrictEqual(fragile.node_ids.sort(), ['n1', 'n4'].sort());
    // r1 is only in s1. r3 is only in s2.
    assert.deepStrictEqual(fragile.relation_types.sort(), ['r1', 'r3'].sort());
  });
});
