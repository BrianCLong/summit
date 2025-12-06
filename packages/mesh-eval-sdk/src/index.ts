/**
 * Agentic Mesh Evaluation SDK
 *
 * TypeScript SDK for building evaluation scenarios, scoring agents,
 * and implementing auto-improvement loops for the Agentic Mesh.
 *
 * @packageDocumentation
 */

// Export all types
export * from './types.js';

// Export validators
export * from './validators.js';

// Export utilities
export * from './utils.js';

/**
 * SDK version
 */
export const VERSION = '0.1.0';

/**
 * SDK metadata
 */
export const SDK_INFO = {
  name: '@intelgraph/mesh-eval-sdk',
  version: VERSION,
  description: 'TypeScript SDK for Agentic Mesh Evaluation & Auto-Improvement',
} as const;
