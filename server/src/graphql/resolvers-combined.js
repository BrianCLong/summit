// src/graphql/resolvers-combined.js
const copilotResolvers = require('./resolvers.copilot');
const graphOpsResolvers = require('./resolvers.graphops');
const aiResolvers = require('./resolvers.ai');
const annotationsResolvers = require('./resolvers.annotations');
const { canonicalResolvers } = require('./resolvers.canonical');

// Merge all resolvers
const resolvers = {
  Query: {
    ...(copilotResolvers.Query || {}),
    ...(graphOpsResolvers.Query || {}),
    ...(aiResolvers.Query || {}),
    ...(annotationsResolvers.Query || {}),
    ...(canonicalResolvers.Query || {}),
  },
  Mutation: {
    ...(copilotResolvers.Mutation || {}),
    ...(graphOpsResolvers.Mutation || {}),
    ...(aiResolvers.Mutation || {}),
    ...(annotationsResolvers.Mutation || {}),
  },
  Subscription: {
    ...(copilotResolvers.Subscription || {}),
    ...(graphOpsResolvers.Subscription || {}),
    ...(aiResolvers.Subscription || {}),
    ...(annotationsResolvers.Subscription || {}),
  },
  // Custom types
  CanonicalEntity: canonicalResolvers.CanonicalEntity,

  Entity: {
    ...(annotationsResolvers.Entity || {}),
  },
  Edge: {
    ...(annotationsResolvers.Edge || {}),
  },
};

module.exports = resolvers;
