"use strict";
// @ts-nocheck
/**
 * DataLoader Infrastructure for GraphQL Resolvers
 * Implements batch loading to prevent N+1 queries
 *
 * SOC 2 Controls: CC7.1 (System Operations)
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDataLoaders = createDataLoaders;
exports.getDataLoaderStats = getDataLoaderStats;
const dataloader_1 = __importDefault(require("dataloader"));
const entityLoader_js_1 = require("./entityLoader.js");
const relationshipLoader_js_1 = require("./relationshipLoader.js");
const investigationLoader_js_1 = require("./investigationLoader.js");
const userLoader_js_1 = require("./userLoader.js");
const complianceAssessmentLoader_js_1 = require("./complianceAssessmentLoader.js");
const pluginConfigLoader_js_1 = require("./pluginConfigLoader.js");
const policyVerdictLoader_js_1 = require("./policyVerdictLoader.js");
/**
 * Creates all DataLoaders for a single request context
 * DataLoaders are request-scoped to ensure proper batching
 */
function createDataLoaders(context) {
    return {
        // Entity loaders
        entityLoader: (0, entityLoader_js_1.createEntityLoader)(context),
        relationshipLoader: (0, relationshipLoader_js_1.createRelationshipLoader)(context),
        investigationLoader: (0, investigationLoader_js_1.createInvestigationLoader)(context),
        userLoader: (0, userLoader_js_1.createUserLoader)(context),
        entitiesByTypeLoader: new dataloader_1.default(async (types) => {
            // Batch load entities by type
            const session = context.neo4jDriver.session();
            try {
                const result = await session.run(`
          UNWIND $types AS type
          MATCH (n:Entity {tenantId: $tenantId})
          WHERE type IN labels(n)
          RETURN type, collect(n) as entities
          `, { types: types, tenantId: context.tenantId });
                const entitiesByType = new Map();
                result.records.forEach((record) => {
                    const type = record.get('type');
                    const entities = record.get('entities').map((entity) => ({
                        id: entity.properties.id,
                        type: entity.labels[0],
                        props: entity.properties,
                        createdAt: entity.properties.createdAt,
                        updatedAt: entity.properties.updatedAt,
                    }));
                    entitiesByType.set(type, entities);
                });
                return types.map((type) => entitiesByType.get(type) || []);
            }
            finally {
                await session.close();
            }
        }),
        // Compliance loaders
        complianceAssessmentLoader: (0, complianceAssessmentLoader_js_1.createComplianceAssessmentLoader)(context),
        assessmentsByControlLoader: (0, complianceAssessmentLoader_js_1.createAssessmentsByControlLoader)(context),
        assessmentsByFrameworkLoader: (0, complianceAssessmentLoader_js_1.createAssessmentsByFrameworkLoader)(context),
        // Plugin loaders
        pluginConfigLoader: (0, pluginConfigLoader_js_1.createPluginConfigLoader)(context),
        allPluginsForTenantLoader: (0, pluginConfigLoader_js_1.createAllPluginsForTenantLoader)(context),
        enabledPluginsLoader: (0, pluginConfigLoader_js_1.createEnabledPluginsLoader)(context),
        // Policy verdict loaders
        policyVerdictLoader: (0, policyVerdictLoader_js_1.createPolicyVerdictLoader)(context),
        verdictByKeyLoader: (0, policyVerdictLoader_js_1.createVerdictByKeyLoader)(context),
        verdictsBySubjectLoader: (0, policyVerdictLoader_js_1.createVerdictsBySubjectLoader)(context),
        deniedVerdictsLoader: (0, policyVerdictLoader_js_1.createDeniedVerdictsLoader)(context),
    };
}
/**
 * DataLoader statistics for monitoring
 */
function getDataLoaderStats(loaders) {
    return {
        entity: {
            cacheSize: loaders.entityLoader['_cacheMap']?.size || 0,
        },
        relationship: {
            cacheSize: loaders.relationshipLoader['_cacheMap']?.size || 0,
        },
        investigation: {
            cacheSize: loaders.investigationLoader['_cacheMap']?.size || 0,
        },
        user: {
            cacheSize: loaders.userLoader['_cacheMap']?.size || 0,
        },
    };
}
