"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.createInvestigationGraph = exports.createThreatIntelGraph = exports.createBipartiteGraph = exports.createTreeGraph = exports.createCompleteGraph = exports.createChainGraph = exports.createStarGraph = exports.createRandomGraph = exports.createViewerContext = exports.createAnalystContext = exports.createAdminContext = exports.createUnauthenticatedContext = exports.createContextForUser = exports.enhancedContextFactory = exports.createHubRelationships = exports.createRelationshipChain = exports.createRelationshipBetween = exports.enhancedRelationshipFactory = exports.criticalInvestigationFactory = exports.incidentResponseFactory = exports.aptInvestigationFactory = exports.enhancedInvestigationFactory = exports.malwareEntityFactory = exports.threatEntityFactory = exports.domainEntityFactory = exports.ipAddressEntityFactory = exports.personEntityFactory = exports.enhancedEntityFactory = exports.viewerUserFactory = exports.analystUserFactory = exports.adminUserFactory = exports.enhancedUserFactory = exports.random = exports.resetAllSequences = exports.getSequence = exports.Sequence = exports.defineFactory = exports.BaseFactory = void 0;
// Base factory utilities
var base_1 = require("../base");
Object.defineProperty(exports, "BaseFactory", { enumerable: true, get: function () { return base_1.BaseFactory; } });
Object.defineProperty(exports, "defineFactory", { enumerable: true, get: function () { return base_1.defineFactory; } });
Object.defineProperty(exports, "Sequence", { enumerable: true, get: function () { return base_1.Sequence; } });
Object.defineProperty(exports, "getSequence", { enumerable: true, get: function () { return base_1.getSequence; } });
Object.defineProperty(exports, "resetAllSequences", { enumerable: true, get: function () { return base_1.resetAllSequences; } });
Object.defineProperty(exports, "random", { enumerable: true, get: function () { return base_1.random; } });
// User factory
var EnhancedUserFactory_1 = require("./EnhancedUserFactory");
Object.defineProperty(exports, "enhancedUserFactory", { enumerable: true, get: function () { return EnhancedUserFactory_1.enhancedUserFactory; } });
Object.defineProperty(exports, "adminUserFactory", { enumerable: true, get: function () { return EnhancedUserFactory_1.adminUserFactory; } });
Object.defineProperty(exports, "analystUserFactory", { enumerable: true, get: function () { return EnhancedUserFactory_1.analystUserFactory; } });
Object.defineProperty(exports, "viewerUserFactory", { enumerable: true, get: function () { return EnhancedUserFactory_1.viewerUserFactory; } });
// Entity factory
var EnhancedEntityFactory_1 = require("./EnhancedEntityFactory");
Object.defineProperty(exports, "enhancedEntityFactory", { enumerable: true, get: function () { return EnhancedEntityFactory_1.enhancedEntityFactory; } });
Object.defineProperty(exports, "personEntityFactory", { enumerable: true, get: function () { return EnhancedEntityFactory_1.personEntityFactory; } });
Object.defineProperty(exports, "ipAddressEntityFactory", { enumerable: true, get: function () { return EnhancedEntityFactory_1.ipAddressEntityFactory; } });
Object.defineProperty(exports, "domainEntityFactory", { enumerable: true, get: function () { return EnhancedEntityFactory_1.domainEntityFactory; } });
Object.defineProperty(exports, "threatEntityFactory", { enumerable: true, get: function () { return EnhancedEntityFactory_1.threatEntityFactory; } });
Object.defineProperty(exports, "malwareEntityFactory", { enumerable: true, get: function () { return EnhancedEntityFactory_1.malwareEntityFactory; } });
// Investigation factory
var EnhancedInvestigationFactory_1 = require("./EnhancedInvestigationFactory");
Object.defineProperty(exports, "enhancedInvestigationFactory", { enumerable: true, get: function () { return EnhancedInvestigationFactory_1.enhancedInvestigationFactory; } });
Object.defineProperty(exports, "aptInvestigationFactory", { enumerable: true, get: function () { return EnhancedInvestigationFactory_1.aptInvestigationFactory; } });
Object.defineProperty(exports, "incidentResponseFactory", { enumerable: true, get: function () { return EnhancedInvestigationFactory_1.incidentResponseFactory; } });
Object.defineProperty(exports, "criticalInvestigationFactory", { enumerable: true, get: function () { return EnhancedInvestigationFactory_1.criticalInvestigationFactory; } });
// Relationship factory
var EnhancedRelationshipFactory_1 = require("./EnhancedRelationshipFactory");
Object.defineProperty(exports, "enhancedRelationshipFactory", { enumerable: true, get: function () { return EnhancedRelationshipFactory_1.enhancedRelationshipFactory; } });
Object.defineProperty(exports, "createRelationshipBetween", { enumerable: true, get: function () { return EnhancedRelationshipFactory_1.createRelationshipBetween; } });
Object.defineProperty(exports, "createRelationshipChain", { enumerable: true, get: function () { return EnhancedRelationshipFactory_1.createRelationshipChain; } });
Object.defineProperty(exports, "createHubRelationships", { enumerable: true, get: function () { return EnhancedRelationshipFactory_1.createHubRelationships; } });
// Context factory
var EnhancedContextFactory_1 = require("./EnhancedContextFactory");
Object.defineProperty(exports, "enhancedContextFactory", { enumerable: true, get: function () { return EnhancedContextFactory_1.enhancedContextFactory; } });
Object.defineProperty(exports, "createContextForUser", { enumerable: true, get: function () { return EnhancedContextFactory_1.createContextForUser; } });
Object.defineProperty(exports, "createUnauthenticatedContext", { enumerable: true, get: function () { return EnhancedContextFactory_1.createUnauthenticatedContext; } });
Object.defineProperty(exports, "createAdminContext", { enumerable: true, get: function () { return EnhancedContextFactory_1.createAdminContext; } });
Object.defineProperty(exports, "createAnalystContext", { enumerable: true, get: function () { return EnhancedContextFactory_1.createAnalystContext; } });
Object.defineProperty(exports, "createViewerContext", { enumerable: true, get: function () { return EnhancedContextFactory_1.createViewerContext; } });
// Graph factory
var EnhancedGraphFactory_1 = require("./EnhancedGraphFactory");
Object.defineProperty(exports, "createRandomGraph", { enumerable: true, get: function () { return EnhancedGraphFactory_1.createRandomGraph; } });
Object.defineProperty(exports, "createStarGraph", { enumerable: true, get: function () { return EnhancedGraphFactory_1.createStarGraph; } });
Object.defineProperty(exports, "createChainGraph", { enumerable: true, get: function () { return EnhancedGraphFactory_1.createChainGraph; } });
Object.defineProperty(exports, "createCompleteGraph", { enumerable: true, get: function () { return EnhancedGraphFactory_1.createCompleteGraph; } });
Object.defineProperty(exports, "createTreeGraph", { enumerable: true, get: function () { return EnhancedGraphFactory_1.createTreeGraph; } });
Object.defineProperty(exports, "createBipartiteGraph", { enumerable: true, get: function () { return EnhancedGraphFactory_1.createBipartiteGraph; } });
Object.defineProperty(exports, "createThreatIntelGraph", { enumerable: true, get: function () { return EnhancedGraphFactory_1.createThreatIntelGraph; } });
Object.defineProperty(exports, "createInvestigationGraph", { enumerable: true, get: function () { return EnhancedGraphFactory_1.createInvestigationGraph; } });
