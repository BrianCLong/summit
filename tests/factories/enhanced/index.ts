/**
 * Enhanced Test Factories
 *
 * Type-safe, trait-based factories for generating comprehensive test data.
 *
 * @module tests/factories/enhanced
 *
 * @example
 * ```typescript
 * import {
 *   enhancedUserFactory,
 *   enhancedEntityFactory,
 *   enhancedInvestigationFactory,
 *   enhancedContextFactory,
 *   createThreatIntelGraph,
 * } from '@tests/factories/enhanced';
 *
 * // Create a user with specific traits
 * const admin = enhancedUserFactory.buildWithTrait('admin');
 * const analyst = enhancedUserFactory.with.trait('analyst').attrs({ email: 'custom@test.com' }).build();
 *
 * // Create entities with traits
 * const maliciousIP = enhancedEntityFactory.with.traits('ipAddress', 'malicious', 'highConfidence').build();
 *
 * // Create investigations
 * const criticalCase = enhancedInvestigationFactory.buildWithTraits(['critical', 'inProgress', 'assigned']);
 *
 * // Create GraphQL context
 * const context = enhancedContextFactory.buildWithTrait('admin');
 *
 * // Create complex graphs
 * const threatGraph = createThreatIntelGraph({ investigationId: 'inv-123' });
 * ```
 */

// Base factory utilities
export {
  BaseFactory,
  defineFactory,
  Sequence,
  getSequence,
  resetAllSequences,
  random,
  type FactoryDefinition,
  type FactoryBuilder,
  type Trait,
} from '../base';

// User factory
export {
  enhancedUserFactory,
  adminUserFactory,
  analystUserFactory,
  viewerUserFactory,
  type TestUserEnhanced,
  type UserRole,
} from './EnhancedUserFactory';

// Entity factory
export {
  enhancedEntityFactory,
  personEntityFactory,
  ipAddressEntityFactory,
  domainEntityFactory,
  threatEntityFactory,
  malwareEntityFactory,
  type TestEntityEnhanced,
  type EntityType,
  type ConfidenceLevel,
} from './EnhancedEntityFactory';

// Investigation factory
export {
  enhancedInvestigationFactory,
  aptInvestigationFactory,
  incidentResponseFactory,
  criticalInvestigationFactory,
  type TestInvestigationEnhanced,
  type InvestigationStatus,
  type InvestigationPriority,
  type ClassificationLevel,
} from './EnhancedInvestigationFactory';

// Relationship factory
export {
  enhancedRelationshipFactory,
  createRelationshipBetween,
  createRelationshipChain,
  createHubRelationships,
  type TestRelationshipEnhanced,
  type RelationshipType,
  type RelationshipDirection,
} from './EnhancedRelationshipFactory';

// Context factory
export {
  enhancedContextFactory,
  createContextForUser,
  createUnauthenticatedContext,
  createAdminContext,
  createAnalystContext,
  createViewerContext,
  type TestContextEnhanced,
  type TestTenant,
  type TestRequestInfo,
  type TestDataSources,
  type TestLoaders,
} from './EnhancedContextFactory';

// Graph factory
export {
  createRandomGraph,
  createStarGraph,
  createChainGraph,
  createCompleteGraph,
  createTreeGraph,
  createBipartiteGraph,
  createThreatIntelGraph,
  createInvestigationGraph,
  type TestGraphEnhanced,
  type GraphFactoryOptions,
} from './EnhancedGraphFactory';
