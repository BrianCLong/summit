"use strict";
/**
 * IntelGraph GraphQL Resolvers
 *
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolvers = void 0;
const graphql_scalars_1 = require("graphql-scalars");
const entity_js_1 = require("./entity.js");
const relationship_js_1 = require("./relationship.js");
const investigation_js_1 = require("./investigation.js");
const analytics_js_1 = require("./analytics.js");
const copilot_js_1 = require("./copilot.js");
const user_js_1 = require("./user.js");
const case_evidence_triage_js_1 = require("./case_evidence_triage.js");
const abac_js_1 = require("../abac.js");
exports.resolvers = {
    // Scalar types
    DateTime: graphql_scalars_1.GraphQLDateTime,
    JSON: graphql_scalars_1.GraphQLJSON,
    // Core queries
    Query: {
        ...entity_js_1.entityResolvers.Query,
        ...relationship_js_1.relationshipResolvers.Query,
        ...investigation_js_1.investigationResolvers.Query,
        ...analytics_js_1.analyticsResolvers.Query,
        ...copilot_js_1.copilotResolvers.Query,
        ...user_js_1.userResolvers.Query,
        ...case_evidence_triage_js_1.cetResolvers.Query,
        // ABAC-wrapped high-value resolvers
        entity: (0, abac_js_1.withABAC)(entity_js_1.entityResolvers.Query?.entity || (async () => null), 'read'),
        investigation: (0, abac_js_1.withABAC)(investigation_js_1.investigationResolvers.Query?.investigation || (async () => null), 'read'),
        investigations: (0, abac_js_1.withABAC)(investigation_js_1.investigationResolvers.Query?.investigations || (async () => []), 'read'),
        caseById: (0, abac_js_1.withABAC)(case_evidence_triage_js_1.cetResolvers.Query?.caseById || (async () => null), 'read'),
        caseExport: (0, abac_js_1.withABAC)(case_evidence_triage_js_1.cetResolvers.Query?.caseExport || (async () => null), 'read'),
        evidenceAnnotations: (0, abac_js_1.withABAC)(case_evidence_triage_js_1.cetResolvers.Query?.evidenceAnnotations || (async () => []), 'read'),
        triageSuggestions: (0, abac_js_1.withABAC)(case_evidence_triage_js_1.cetResolvers.Query?.triageSuggestions || (async () => []), 'read'),
        // Global search across all types
        globalSearch: async (_, { query, types }, context) => {
            const results = {
                entities: [],
                relationships: [],
                investigations: [],
                documents: [],
            };
            try {
                // Parallel search across different types
                const searchPromises = [];
                if (!types || types.includes('entities')) {
                    searchPromises.push(entity_js_1.entityResolvers.Query.searchEntities(_, { query }, context).then((entities) => {
                        results.entities = entities;
                    }));
                }
                if (!types || types.includes('investigations')) {
                    searchPromises.push(investigation_js_1.investigationResolvers.Query.investigations(_, { query }, context).then((investigations) => {
                        results.investigations = investigations;
                    }));
                }
                await Promise.all(searchPromises);
                context.logger.info({
                    message: 'Global search completed',
                    query,
                    types,
                    resultsCount: {
                        entities: results.entities.length,
                        relationships: results.relationships.length,
                        investigations: results.investigations.length,
                        documents: results.documents.length,
                    },
                });
                return results;
            }
            catch (error) {
                context.logger.error({
                    message: 'Global search failed',
                    error: error instanceof Error ? error.message : String(error),
                    query,
                    types,
                });
                throw error;
            }
        },
    },
    // Core mutations
    Mutation: {
        ...entity_js_1.entityResolvers.Mutation,
        ...relationship_js_1.relationshipResolvers.Mutation,
        ...investigation_js_1.investigationResolvers.Mutation,
        ...user_js_1.userResolvers.Mutation,
        createCase: (0, abac_js_1.withABAC)(case_evidence_triage_js_1.cetResolvers.Mutation?.createCase || (async () => null), 'create'),
        approveCase: (0, abac_js_1.withABAC)(case_evidence_triage_js_1.cetResolvers.Mutation?.approveCase || (async () => null), 'update'),
        annotateEvidence: (0, abac_js_1.withABAC)(case_evidence_triage_js_1.cetResolvers.Mutation?.annotateEvidence || (async () => null), 'update'),
        triageSuggest: (0, abac_js_1.withABAC)(case_evidence_triage_js_1.cetResolvers.Mutation?.triageSuggest || (async () => null), 'create'),
        triageApprove: (0, abac_js_1.withABAC)(case_evidence_triage_js_1.cetResolvers.Mutation?.triageApprove || (async () => null), 'update'),
        triageMaterialize: (0, abac_js_1.withABAC)(case_evidence_triage_js_1.cetResolvers.Mutation?.triageMaterialize || (async () => null), 'update'),
    },
    // Subscriptions for real-time updates
    Subscription: {
        entityUpdated: {
            subscribe: async function* (_, { investigationId }, context) {
                const { redis } = context.dataSources;
                const channel = investigationId
                    ? `entity:updated:${investigationId}`
                    : 'entity:updated';
                // Subscribe to Redis channel for entity updates
                const subscriber = redis.duplicate();
                await subscriber.subscribe(channel);
                try {
                    for await (const message of subscriber.scanStream()) {
                        yield { entityUpdated: JSON.parse(message.message) };
                    }
                }
                finally {
                    await subscriber.unsubscribe(channel);
                    await subscriber.quit();
                }
            },
        },
        relationshipUpdated: {
            subscribe: async function* (_, { investigationId }, context) {
                const { redis } = context.dataSources;
                const channel = investigationId
                    ? `relationship:updated:${investigationId}`
                    : 'relationship:updated';
                const subscriber = redis.duplicate();
                await subscriber.subscribe(channel);
                try {
                    for await (const message of subscriber.scanStream()) {
                        yield { relationshipUpdated: JSON.parse(message.message) };
                    }
                }
                finally {
                    await subscriber.unsubscribe(channel);
                    await subscriber.quit();
                }
            },
        },
        investigationUpdated: {
            subscribe: async function* (_, { id }, context) {
                const { redis } = context.dataSources;
                const channel = `investigation:updated:${id}`;
                const subscriber = redis.duplicate();
                await subscriber.subscribe(channel);
                try {
                    for await (const message of subscriber.scanStream()) {
                        yield { investigationUpdated: JSON.parse(message.message) };
                    }
                }
                finally {
                    await subscriber.unsubscribe(channel);
                    await subscriber.quit();
                }
            },
        },
        analysisCompleted: {
            subscribe: async function* (_, { jobId }, context) {
                const { redis } = context.dataSources;
                const channel = `analysis:completed:${jobId}`;
                const subscriber = redis.duplicate();
                await subscriber.subscribe(channel);
                try {
                    for await (const message of subscriber.scanStream()) {
                        yield { analysisCompleted: JSON.parse(message.message) };
                    }
                }
                finally {
                    await subscriber.unsubscribe(channel);
                    await subscriber.quit();
                }
            },
        },
    },
    // Type resolvers for nested fields
    Entity: {
        ...entity_js_1.entityResolvers.Entity,
    },
    Relationship: {
        ...relationship_js_1.relationshipResolvers.Relationship,
    },
    Investigation: {
        ...investigation_js_1.investigationResolvers.Investigation,
    },
    User: {
        ...user_js_1.userResolvers.User,
    },
};
