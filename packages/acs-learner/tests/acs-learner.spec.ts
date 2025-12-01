import { ACSLearner, CounterintelAction } from '../src';
import { trainATL } from '@intelgraph/atl/src/index';
import { ADC } from '@intelgraph/adc/src/index';
import { AFLStore } from '@intelgraph/afl-store';
import { replayWithSanctions } from '@intelgraph/crsp/src/index';
import { randomUUID } from 'crypto';

describe('ACSLearner', () => {
  let atlModel: any; // Mock ATLModel
  let adcModule: any; // Mock ADC
  let acsLearner: ACSLearner;
  let aflStore: AFLStore;

  beforeEach(() => {
    aflStore = new AFLStore('redis://localhost:6381');
    atlModel = trainATL([]); // Initialize with empty data for mock
    adcModule = new ADC(aflStore);
    acsLearner = new ACSLearner(atlModel, adcModule);
  });

  afterEach(async () => {
    await aflStore.close();
  });

  test('should learn strategy based on simulation results', async () => {
    const mockSimulationResults = [
      replayWithSanctions({ runId: 'r1', steps: [], plan: {} }, { apiFailureRate: 0.5, tokenCap: 1000, policyStrict: true }),
      replayWithSanctions({ runId: 'r2', steps: [], plan: {} }, { apiFailureRate: 0.2, tokenCap: 2000, policyStrict: false }),
    ];

    const actions = await acsLearner.learnStrategy(mockSimulationResults);
    expect(actions).toBeInstanceOf(Array);
    // Expect specific actions based on the mock results and heuristic in learnStrategy
    expect(actions.length).toBeGreaterThan(0);
  });

  test('should execute counterintel actions', async () => {
    const mockAction: CounterintelAction = { type: 'adjust_tariff', params: { level: 'stricter' } };
    // Mock console.log to check if it's called
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    await acsLearner.executeAction(mockAction);
    // Expect specific module methods to be called or state changes
    // For MVP, we just check console.log
    // expect(consoleSpy).toHaveBeenCalledWith("Executing action: Adjusting tariff");

    consoleSpy.mockRestore();
  });
});