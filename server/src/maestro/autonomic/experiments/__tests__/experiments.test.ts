
import { ExperimentationService } from '../experimentation-service';
import { Experiment } from '../types';

describe('ExperimentationService', () => {
  let service: ExperimentationService;

  beforeEach(() => {
    service = new ExperimentationService();
  });

  it('should assign variants deterministically', () => {
    const exp: Experiment = {
      id: 'exp-1',
      name: 'Test Exp',
      hypothesis: 'A is better',
      variants: [
        { id: 'A', trafficWeight: 50, configOverrides: {} },
        { id: 'B', trafficWeight: 50, configOverrides: {} }
      ],
      metrics: [],
      status: 'ACTIVE',
      startDate: new Date(),
      stopConditions: {}
    };
    service.createExperiment(exp);

    const user1 = 'user-123';
    const assign1 = service.getAssignment('exp-1', user1);
    const assign2 = service.getAssignment('exp-1', user1);

    expect(assign1?.variantId).toBe(assign2?.variantId);
    expect(['A', 'B']).toContain(assign1?.variantId);
  });

  it('should stop experiment if condition met', () => {
      const exp: Experiment = {
          id: 'exp-fail',
          name: 'Risky Exp',
          hypothesis: 'Maybe bad',
          variants: [],
          metrics: ['success_rate'],
          status: 'ACTIVE',
          startDate: new Date(),
          stopConditions: { 'success_rate': 0.9 } // Stop if below 0.9
      };
      service.createExperiment(exp);

      const stopped = service.checkStopConditions('exp-fail', { success_rate: 0.8 });
      expect(stopped).toBe(true);
      expect(exp.status).toBe('STOPPED');
  });
});
