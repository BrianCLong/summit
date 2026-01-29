import { describe, it, expect } from 'vitest';
import { RAMPolicy } from '../src/policies/ram.js';
import { TaskDelta } from '../src/core/interfaces.js';

describe('RAMPolicy', () => {
  const policy = new RAMPolicy();
  const context = { threshold: 0.1, rescale: true };

  it('should preserve unique parameters without dilution', () => {
    // Scenario: 3 tasks. Only Task 1 has a significant update at index 0.
    // Standard averaging would give 10/3 = 3.33.
    // RAM should give 10/1 = 10.

    const deltas: TaskDelta[] = [
      { id: 't1', parameters: { 'w': [10.0, 0.0, 5.0] } },
      { id: 't2', parameters: { 'w': [0.05, 10.0, 5.0] } }, // 0.05 is below threshold
      { id: 't3', parameters: { 'w': [0.0, 0.0, 5.0] } }
    ];

    const result = policy.merge(deltas, context);
    const merged = result.mergedDelta.parameters['w'];

    // Index 0: Unique to t1 (10.0). t2(0.05) is ignored. t3(0) is ignored.
    expect(merged[0]).toBeCloseTo(10.0);

    // Index 1: Unique to t2 (10.0).
    expect(merged[1]).toBeCloseTo(10.0);

    // Index 2: Shared by all 3 (5.0, 5.0, 5.0). Average is 5.0.
    expect(merged[2]).toBeCloseTo(5.0);
  });

  it('should average shared parameters correctly', () => {
    // Scenario: Task 1 and Task 2 share an update. Task 3 is silent.
    const deltas: TaskDelta[] = [
      { id: 't1', parameters: { 'w': [10.0] } },
      { id: 't2', parameters: { 'w': [20.0] } },
      { id: 't3', parameters: { 'w': [0.0] } }
    ];

    const result = policy.merge(deltas, context);
    const merged = result.mergedDelta.parameters['w'];

    // Average of 10 and 20 is 15.
    // Standard averaging (divide by 3) would be 10.
    expect(merged[0]).toBeCloseTo(15.0);
  });

  it('should zero out parameters below threshold in all tasks', () => {
    const deltas: TaskDelta[] = [
      { id: 't1', parameters: { 'w': [0.05] } },
      { id: 't2', parameters: { 'w': [-0.05] } }
    ];

    const result = policy.merge(deltas, context);
    expect(result.mergedDelta.parameters['w'][0]).toBe(0);
  });

  it('should generate correct evidence stats', () => {
    const deltas: TaskDelta[] = [
      { id: 't1', parameters: { 'w': [10.0, 10.0, 0.0, 0.0] } },
      { id: 't2', parameters: { 'w': [0.0, 10.0, 10.0, 0.0] } }
    ];
    // Index 0: Unique to t1
    // Index 1: Shared (t1, t2)
    // Index 2: Unique to t2
    // Index 3: Inactive (both 0)

    const result = policy.merge(deltas, context);
    const stats = result.stats;

    // Total elements: 4
    expect(stats.totalParams).toBe(4);

    // Unique elements: Index 0 and Index 2. Count = 2.
    // Ratio = 2/4 = 0.5
    expect(stats.uniqueRatio).toBe(0.5);

    // Shared elements: Index 1. Count = 1.
    // Ratio = 1/4 = 0.25
    expect(stats.sharedRatio).toBe(0.25);
  });
});
