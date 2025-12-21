/**
 * MC Platform v0.4.1 Sovereign Safeguards Resolver Integration
 * Exports all v0.4.1 sovereign safeguards resolvers
 */

import { sovereignResolvers } from './sovereign-resolvers';
import { mergeResolvers } from '@graphql-tools/merge';

// Merge all v0.4.1 resolvers
export const v041Resolvers = mergeResolvers([sovereignResolvers]);

// Export individual resolver modules for selective importing
export { sovereignResolvers } from './sovereign-resolvers';
