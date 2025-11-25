// server/tests/necromancer.service.spec.ts
import { NecromancerService } from '../src/necromancer/NecromancerService';
import { BehavioralCloneParameters } from '../src/necromancer/necromancer.types';

jest.useFakeTimers();

describe('NecromancerService', () => {
  let necromancerService: NecromancerService;

  beforeEach(() => {
    necromancerService = new NecromancerService();
  });

  it('should initialize with active synthetic identities', async () => {
    const synthetics = await necromancerService.getAllSynthetics();
    expect(synthetics.length).toBeGreaterThan(0);
  });

  it('should initiate a new digital afterlife', async () => {
    const params: BehavioralCloneParameters = {
      targetId: 'hvt-999',
      targetName: 'Newly Deceased Target',
      digitalFootprintUris: ['uri1', 'uri2'],
    };
    const newSyntheticPromise = necromancerService.initiateDigitalAfterlife(params);
    await jest.runAllTimersAsync();
    const newSynthetic = await newSyntheticPromise;

    expect(newSynthetic).toBeDefined();
    expect(newSynthetic.sourceTargetName).toBe(params.targetName);
    expect(newSynthetic.status).toBe('active');
    expect(newSynthetic.behavioralFidelity).toBeGreaterThan(0.98);

    const synthetics = await necromancerService.getAllSynthetics();
    const initialCount = 2; // Based on the constructor
    expect(synthetics).toHaveLength(initialCount + 1);
  });

  it('should retrieve a specific synthetic identity', async () => {
    const synthetics = await necromancerService.getAllSynthetics();
    const syntheticId = synthetics[0].syntheticId;
    const retrieved = await necromancerService.getSyntheticIdentity(syntheticId);
    expect(retrieved).toBeDefined();
    expect(retrieved?.syntheticId).toBe(syntheticId);
  });

  it('should generate plausible activity for a synthetic identity', async () => {
    const synthetics = await necromancerService.getAllSynthetics();
    const syntheticId = synthetics[0].syntheticId;

    const activity = await necromancerService.getSyntheticActivity(syntheticId, 3);
    expect(activity).toHaveLength(3);
    expect(activity[0].syntheticId).toBe(syntheticId);
    expect(activity[0].content).toContain(synthetics[0].sourceTargetName);
  });

  it('should throw an error when getting activity for a non-existent synthetic', async () => {
    await expect(necromancerService.getSyntheticActivity('unknown-id')).rejects.toThrow(
      'Synthetic identity with ID unknown-id not found.',
    );
  });
});
