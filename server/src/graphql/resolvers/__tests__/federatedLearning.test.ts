import axios from 'axios';

import { federatedLearningResolvers } from '../federatedLearning';

jest.mock('axios');

describe('federatedLearningResolvers', () => {
  const axiosMock = axios as jest.Mocked<typeof axios>;
  const isAxiosErrorMock = axios.isAxiosError as unknown as jest.Mock;

  beforeEach(() => {
    jest.resetAllMocks();
    isAxiosErrorMock.mockReturnValue(false);
  });

  it('starts a federated training job and returns job payload', async () => {
    axiosMock.post.mockResolvedValue({
      data: { job: { jobId: 'job-1', status: 'RUNNING', startedAt: new Date().toISOString() } },
    } as any);

    const result = await federatedLearningResolvers.Mutation.startFederatedTraining(
      {},
      { input: { clients: [] } },
    );

    expect(result.jobId).toBe('job-1');
    expect(axiosMock.post).toHaveBeenCalledWith(
      expect.stringContaining('/api/federated/train'),
      { clients: [] },
      expect.objectContaining({ timeout: expect.any(Number) }),
    );
  });

  it('retrieves an existing federated job by id', async () => {
    axiosMock.get.mockResolvedValue({
      data: { job: { jobId: 'job-2', status: 'COMPLETED' } },
    } as any);

    const job = await federatedLearningResolvers.Query.federatedTrainingJob({}, { jobId: 'job-2' });

    expect(job).toEqual({ jobId: 'job-2', status: 'COMPLETED' });
    expect(axiosMock.get).toHaveBeenCalledWith(expect.stringContaining('/api/federated/jobs/job-2'));
  });

  it('surfaced service error messages when training fails', async () => {
    const error = new Error('bad request');
    (error as any).response = { data: { error: 'invalid dataset' } };
    isAxiosErrorMock.mockReturnValue(true);
    axiosMock.post.mockRejectedValue(error);

    await expect(
      federatedLearningResolvers.Mutation.startFederatedTraining({}, { input: { clients: [] } }),
    ).rejects.toThrow('invalid dataset');
  });
});
