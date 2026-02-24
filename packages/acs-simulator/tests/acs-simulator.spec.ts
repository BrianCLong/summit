import { ACSSimulator, SimulationState, AdversaryAction } from '../src';
import { trainATL } from '@intelgraph/atl/src/index';
import { ADC } from '@intelgraph/adc/src/index';
import { AFLStore } from '@intelgraph/afl-store';

describe('ACSSimulator', () => {
  let atlModel: any; // Mock ATLModel
  let adcModule: any; // Mock ADC
  let acsSimulator: ACSSimulator;
  let aflStore: AFLStore;

  beforeEach(() => {
    aflStore = new AFLStore('redis://localhost:6381');
    atlModel = trainATL([]); // Initialize with empty data for mock
    adcModule = new ADC(aflStore);
    acsSimulator = new ACSSimulator(atlModel, adcModule);
  });

  afterEach(async () => {
    await aflStore.close();
  });

  test('should run a simulation and return replay results', async () => {
    const initialState: SimulationState = {
      currentTariff: { minProofLevel: 'standard', rateLimit: 10, throttleMs: 0 },
      adversaryFingerprints: [],
    };
    const adversaryStrategy: AdversaryAction[] = [
      { type: 'attack', params: { target: 'system' } },
      { type: 'evade', params: { method: 'obfuscation' } },
    ];

    const results = await acsSimulator.runSimulation(initialState, adversaryStrategy);
    expect(results).toBeInstanceOf(Array);
    expect(results.length).toBe(adversaryStrategy.length);
  });
});