// server/tests/mnemosyne.service.spec.ts
import { MnemosyneService } from '../src/mnemosyne/MnemosyneService';
import { FalseMemoryPayload } from '../src/mnemosyne/mnemosyne.types';

jest.useFakeTimers();

describe('MnemosyneService', () => {
  let mnemosyneService: MnemosyneService;

  beforeEach(() => {
    mnemosyneService = new MnemosyneService();
  });

  it('should create a memory fabrication job with an active status', async () => {
    const payload: FalseMemoryPayload = {
      targetId: 'target-001',
      targetName: 'Test Target',
      narrative: 'A fabricated meeting.',
      sensoryDetails: { visuals: [], sounds: [], smells: [] },
      deliveryVector: 'compromised_personal_device',
    };
    const job = await mnemosyneService.fabricateAndDeploy(payload);
    expect(job).toBeDefined();
    expect(job.status).toBe('active');
    expect(job.payload).toEqual(payload);
    expect(job.beliefFormationReport).toBeUndefined();
  });

  it('should complete a job and generate a belief formation report', async () => {
    const payload: FalseMemoryPayload = {
        targetId: 'target-002',
        targetName: 'Another Target',
        narrative: 'Another fabricated meeting.',
        sensoryDetails: { visuals: ["rain"], sounds: [], smells: [] },
        deliveryVector: 'targeted_social_media',
    };
    const initialJob = await mnemosyneService.fabricateAndDeploy(payload);
    const jobId = initialJob.jobId;

    // Simulate the 21-day period
    await jest.runAllTimersAsync();

    const completedJob = await mnemosyneService.getJobStatus(jobId);
    expect(completedJob).toBeDefined();
    expect(completedJob?.status).toBe('complete');
    expect(completedJob?.beliefFormationReport).toBeDefined();
    expect(completedJob?.beliefFormationReport?.jobId).toBe(jobId);
    expect(completedJob?.beliefFormationReport?.successRate).toBeGreaterThanOrEqual(0.6);
  });

  it('should return undefined for a non-existent job', async () => {
    const job = await mnemosyneService.getJobStatus('non-existent-id');
    expect(job).toBeUndefined();
  });
});
