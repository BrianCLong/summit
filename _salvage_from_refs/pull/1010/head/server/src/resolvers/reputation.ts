import { getReputation, topPublishers } from '../reputation/ReputationService';

export const reputationResolvers = {
  Query: {
    reputation: (_: unknown, { publisher }: { publisher: string }) => getReputation(publisher),
    topPublishers: (_: unknown, { limit }: { limit: number }) => topPublishers(limit),
  },
};
