import entityResolvers from './entity';
import relationshipResolvers from './relationship';
import userResolvers from './user';
import investigationResolvers from './investigation';
import analyticsService from '../services/analyticsService'; // Import the new service

const resolvers = {
  Query: {
    ...entityResolvers.Query,
    ...userResolvers.Query,
    ...investigationResolvers.Query,
  },
  Mutation: {
    ...entityResolvers.Mutation,
    ...relationshipResolvers.Mutation,
    ...userResolvers.Mutation,
    ...investigationResolvers.Mutation,
    // Add the new analytics mutation
    runCommunityDetection: async () => {
      return await analyticsService.runCommunityDetection();
    },
  },
};

export default resolvers;

