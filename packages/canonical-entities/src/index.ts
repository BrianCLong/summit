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

export * from './types';
export * from './edges';
export * from './temporal';
export * from './policy';
export * from './validation';
export * from './graphql-types';
