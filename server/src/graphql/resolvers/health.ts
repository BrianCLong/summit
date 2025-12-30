import { getHealthScore } from '../../../health/aggregator.js';

const healthResolvers = {
  Query: {
    healthScore: () => getHealthScore(),
  },
};

export default healthResolvers;
