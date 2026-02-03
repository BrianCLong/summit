/**
 * Canonical Entity Types for Summit Platform
 *
 * Provides comprehensive graph schema with:
 * - Extended entity types (19 total)
 * - Edge/relationship types with policy labels
 * - Temporal/bitemporal query helpers
 * - Policy & governance engine (ABAC/RBAC)
 *
 * @module canonical-entities
 */

export * from './types.js';
export * from './edges.js';
export * from './temporal.js';
export * from './policy.js';
export * from './validation.js';
export * from './graphql-types.js';
