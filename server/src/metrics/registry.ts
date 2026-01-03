import {
  collectDefaultMetrics,
  register as defaultRegistry,
  Registry,
} from 'prom-client';

// Create a new registry instance to avoid global persistence issues in tests
export const createRegistry = (): Registry => {
  const registry = new Registry();
  // Only collect default metrics in production mode
  if (process.env.NODE_ENV !== 'test') {
    collectDefaultMetrics({ register: registry, prefix: 'intelgraph_' });
  }
  return registry;
};

// Default registry instance
export const registry = createRegistry();

// Helper function for test cleanup
export const resetRegistry = (): void => {
  if (registry) {
    registry.clear();
  }
};

export default registry;
