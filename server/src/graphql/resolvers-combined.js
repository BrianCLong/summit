// src/graphql/resolvers-combined.js
const copilotResolvers = require('./resolvers.copilot');
const graphOpsResolvers = require('./resolvers.graphops');
const aiResolvers = require('./resolvers.ai');
const annotationsResolvers = require('./resolvers.annotations');
const { canonicalResolvers } = require('./resolvers.canonical');
const threatActorResolvers = require('./resolvers.threat-actor');

// Merge all resolvers
const resolvers = {
  Query: {
    ...(copilotResolvers.Query || {}),
    ...(graphOpsResolvers.Query || {}),
    ...(aiResolvers.Query || {}),
    ...(annotationsResolvers.Query || {}),
    ...(canonicalResolvers.Query || {}),
    ...(threatActorResolvers.Query || {}),
  },
  Mutation: {
    ...(copilotResolvers.Mutation || {}),
    ...(graphOpsResolvers.Mutation || {}),
    ...(aiResolvers.Mutation || {}),
    ...(annotationsResolvers.Mutation || {}),
    ...(threatActorResolvers.Mutation || {}),
  },
  Subscription: {
    ...(copilotResolvers.Subscription || {}),
    ...(graphOpsResolvers.Subscription || {}),
    ...(aiResolvers.Subscription || {}),
    ...(annotationsResolvers.Subscription || {}),
  },
  // Custom types
  CanonicalEntity: canonicalResolvers.CanonicalEntity,
  ThreatActor: threatActorResolvers.ThreatActor,

  Entity: {
    ...(annotationsResolvers.Entity || {}),
  },
  Edge: {
    ...(annotationsResolvers.Edge || {}),
  },
};

module.exports = resolvers;
