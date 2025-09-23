import entityResolvers from './entity.js';
import relationshipResolvers from './relationship.js';
import userResolvers from './user.js';
import investigationResolvers from './investigation.js';
import subscriptionResolvers from './subscriptions.js'; // New import

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
  Subscription: { // New Subscription field
    ...subscriptionResolvers.Subscription,
  },
};

export default resolvers;