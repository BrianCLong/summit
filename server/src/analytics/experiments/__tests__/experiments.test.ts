import { describe, it, expect, beforeEach } from '@jest/globals';
import { ExperimentService } from '../ExperimentService.js';
import { Experiment } from '../types.js';

describe('ExperimentService', () => {
  let service: ExperimentService;

  beforeEach(() => {
    service = new ExperimentService({ salt: 'test-salt' });
  });

  const sampleExp: Experiment = {
    id: 'exp-1',
    owner: 'jules',
    hypothesis: 'dark mode increases retention',
    variants: [
      { id: 'control', name: 'Light Mode', weight: 50 },
      { id: 'treatment', name: 'Dark Mode', weight: 50 },
    ],
    allocation: 100, // 100% of users
    startDate: new Date().toISOString(),
    status: 'active',
  };

  it('should create and retrieve experiment', () => {
    service.createExperiment(sampleExp);
    const retrieved = service.getExperiment('exp-1');
    expect(retrieved).toEqual(sampleExp);
  });

  it('should validate weights sum to 100', () => {
    const invalidExp = { ...sampleExp, id: 'bad', variants: [{ id: 'a', name: 'A', weight: 90 }] };
    expect(() => service.createExperiment(invalidExp)).toThrow('weights must sum to 100');
  });

  it('should deterministically assign variants', () => {
    service.createExperiment(sampleExp);

    const tenantId = 't1';
    const userId = 'u1';

    const assignment1 = service.assign('exp-1', tenantId, userId);
    const assignment2 = service.assign('exp-1', tenantId, userId);

    expect(assignment1.variantId).not.toBeNull();
    expect(assignment1.variantId).toBe(assignment2.variantId);
    expect(assignment1.reason).toBe('allocated');
  });

  it('should respect allocation percentage', () => {
    const partialExp: Experiment = {
      ...sampleExp,
      id: 'exp-partial',
      allocation: 0, // 0% allocation
    };
    service.createExperiment(partialExp);

    const assignment = service.assign('exp-partial', 't1', 'u1');
    expect(assignment.variantId).toBeNull();
    expect(assignment.reason).toBe('exclusion');
  });

  it('should distribute roughly according to weights', () => {
     service.createExperiment(sampleExp);

     const counts: Record<string, number> = { control: 0, treatment: 0 };
     const N = 1000;

     for (let i = 0; i < N; i++) {
         const userId = `user-${i}`;
         const assignment = service.assign('exp-1', 't1', userId);
         if (assignment.variantId) {
             counts[assignment.variantId]++;
         }
     }

     // With 50/50 split and 1000 users, expect roughly 500 each.
     // Tolerance: +/- 10% (450-550)
     expect(counts.control).toBeGreaterThan(400);
     expect(counts.control).toBeLessThan(600);
     expect(counts.treatment).toBeGreaterThan(400);
     expect(counts.treatment).toBeLessThan(600);
  });
});
