import entityResolvers from './entity';
import relationshipResolvers from './relationship';
import userResolvers from './user';
import investigationResolvers from './investigation';

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

