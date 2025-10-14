/**
 * MC Platform v0.4.0 Resolver Integration
 * Exports all v0.4.0 transcendent intelligence resolvers
 */

import { transcendentResolvers } from './transcendent-resolvers';
import { mergeResolvers } from '@graphql-tools/merge';

// Merge all v0.4.0 resolvers
export const v040Resolvers = mergeResolvers([
  transcendentResolvers
]);

// Export individual resolver modules for selective importing
export { transcendentResolvers } from './transcendent-resolvers';