import entityResolvers from "./entity.js";
import relationshipResolvers from "./relationship.js";
import userResolvers from "./user.js";
import investigationResolvers from "./investigation.js";
import aiAnalysisResolvers from "./aiAnalysis.js";
import graphragResolvers from "./graphragResolvers.js";
import { similarityResolvers } from "./similarity.js";
import { GraphQLScalarType, Kind } from "graphql";
// import subscriptionResolvers from './subscriptions.js'; // Temporarily disabled - file doesn't exist

// Simple JSON scalar implementation
const GraphQLJSON = new GraphQLScalarType({
  name: "JSON",
  description: "JSON scalar type",
  serialize: (value) => value,
  parseValue: (value) => value,
  parseLiteral: (ast) => {
    if (ast.kind === Kind.STRING) {
      return JSON.parse(ast.value);
    }
    return null;
  },
});

const resolvers = {
  JSON: GraphQLJSON,
  Query: {
    ...entityResolvers.Query,
    ...userResolvers.Query,
    ...investigationResolvers.Query,
    ...aiAnalysisResolvers.Query,
    ...graphragResolvers.Query,
    ...similarityResolvers.Query,
  },
  Mutation: {
    ...entityResolvers.Mutation,
    ...relationshipResolvers.Mutation,
    ...userResolvers.Mutation,
    ...investigationResolvers.Mutation,
    ...aiAnalysisResolvers.Mutation,
    ...graphragResolvers.Mutation,
  },
  Subscription: {
    // New Subscription field
    // ...subscriptionResolvers.Subscription, // Temporarily disabled
  },
  ...(graphragResolvers.GraphRAGResponse && {
    GraphRAGResponse: graphragResolvers.GraphRAGResponse,
  }),
  ...(graphragResolvers.WhyPath && {
    WhyPath: graphragResolvers.WhyPath,
  }),
  ...(graphragResolvers.Citations && {
    Citations: graphragResolvers.Citations,
  }),
};

export default resolvers;
