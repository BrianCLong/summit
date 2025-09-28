/**
 * MC Platform v0.4.2 "Cognitive Synthesis Engine" - Resolver Index
 *
 * Exports all v0.4.2 cognitive synthesis resolvers for integration
 * with the main GraphQL resolver system.
 */

export { default as cognitiveSynthesisResolvers } from './cognitive-synthesis-resolvers';

// Export combined v0.4.2 resolvers
export const v042Resolvers = {
  ...require('./cognitive-synthesis-resolvers').default,
};

export default v042Resolvers;