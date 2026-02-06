/**
 * GraphQL Layer Entry Point
 * Exports modern Apollo Server v5 implementation and types
 */

export * from './apollo-v5-server.js';

// Re-export DataLoaders for convenience
export { createDataLoaders, type DataLoaders, type DataLoaderContext } from './dataloaders/index.js';
