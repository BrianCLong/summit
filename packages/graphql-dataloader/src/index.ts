/**
 * GraphQL DataLoader Package
 *
 * Eliminates N+1 queries in GraphQL resolvers by batching and caching
 */

export { createEntityLoader } from './createEntityLoader';
export { createRelationshipLoader } from './createRelationshipLoader';
export { createAggregateLoader } from './createAggregateLoader';
export { DataLoaderRegistry } from './DataLoaderRegistry';
export * from './types';
