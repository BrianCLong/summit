import entityResolvers from './entity.js';
import relationshipResolvers from './relationship.js';
import userResolvers from './user.js';
import investigationResolvers from './investigation.js';

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
  },
};

export default resolvers;
