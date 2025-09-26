import axios from 'axios';

import logger from '../../config/logger';

const log = logger.child({ scope: 'FederatedLearningResolvers' });
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:4003';

export const federatedLearningResolvers = {
  Query: {
    federatedTrainingJob: async (_: unknown, { jobId }: { jobId: string }) => {
      try {
        const { data } = await axios.get(`${ML_SERVICE_URL}/api/federated/jobs/${jobId}`);
        return data.job;
      } catch (error) {
        log.error({ error, jobId }, 'Failed to fetch federated training job');
        throw new Error('Failed to retrieve federated training job');
      }
    },
  },
  Mutation: {
    startFederatedTraining: async (
      _: unknown,
      { input }: { input: Record<string, unknown> },
    ) => {
      try {
        const { data } = await axios.post(`${ML_SERVICE_URL}/api/federated/train`, input, {
          timeout: 10 * 60 * 1000, // allow up to 10 minutes for synchronous training
        });
        return data.job;
      } catch (error) {
        log.error({ error }, 'Failed to start federated training job');
        if (axios.isAxiosError(error) && error.response?.data?.error) {
          throw new Error(error.response.data.error);
        }
        throw new Error('Failed to start federated training job');
      }
    },
  },
};

export default federatedLearningResolvers;
