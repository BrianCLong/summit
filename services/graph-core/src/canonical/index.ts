/**
 * Canonical Model Module
 *
 * Exports all canonical types, validation schemas, and store.
 *
 * @module graph-core/canonical
 */

// Types and enums
export * from './types.js';

// Validation schemas
export * from './validation.js';

// Graph store
export { GraphStore, graphStore } from './store.js';
export type { NeighborhoodResult, TimeSnapshot } from './store.js';
