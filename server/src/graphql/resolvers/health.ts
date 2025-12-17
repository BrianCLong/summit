import { getHealthScore } from '../../../health/aggregator';

const healthResolvers = {
  Query: {
    healthScore: () => getHealthScore(),
  },
};

export default healthResolvers;
