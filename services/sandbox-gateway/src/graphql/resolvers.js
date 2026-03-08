"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolvers = void 0;
const graphql_1 = require("graphql");
const uuid_1 = require("uuid");
const sandbox_tenant_profile_1 = require("@intelgraph/sandbox-tenant-profile");
const datalab_service_1 = require("@intelgraph/datalab-service");
const logger_js_1 = require("../utils/logger.js");
const index_js_1 = require("../metrics/index.js");
const logger = (0, logger_js_1.createLogger)('GraphQLResolvers');
// Service instances
const configManager = new sandbox_tenant_profile_1.SandboxConfigManager();
const enforcer = new sandbox_tenant_profile_1.SandboxEnforcer();
const validator = new sandbox_tenant_profile_1.SandboxValidator();
const dataLabAPI = new datalab_service_1.DataLabAPI();
const cloneService = new datalab_service_1.DataCloneService();
const syntheticGenerator = new datalab_service_1.SyntheticDataGenerator();
const promotionWorkflow = new datalab_service_1.PromotionWorkflow();
// Start time for uptime calculation
const startTime = Date.now();
// Custom scalars
const DateTimeScalar = new graphql_1.GraphQLScalarType({
    name: 'DateTime',
    description: 'DateTime custom scalar type',
    serialize(value) {
        if (value instanceof Date) {
            return value.toISOString();
        }
        throw new Error('DateTime must be a Date object');
    },
    parseValue(value) {
        if (typeof value === 'string') {
            return new Date(value);
        }
        throw new Error('DateTime must be a string');
    },
    parseLiteral(ast) {
        if (ast.kind === graphql_1.Kind.STRING) {
            return new Date(ast.value);
        }
        throw new Error('DateTime must be a string');
    },
});
const JSONScalar = new graphql_1.GraphQLScalarType({
    name: 'JSON',
    description: 'JSON custom scalar type',
    serialize(value) {
        return value;
    },
    parseValue(value) {
        return value;
    },
    parseLiteral(ast) {
        if (ast.kind === graphql_1.Kind.STRING) {
            return JSON.parse(ast.value);
        }
        if (ast.kind === graphql_1.Kind.OBJECT) {
            return ast.fields.reduce((acc, field) => {
                acc[field.name.value] = JSONScalar.parseLiteral(field.value);
                return acc;
            }, {});
        }
        return null;
    },
});
const UUIDScalar = new graphql_1.GraphQLScalarType({
    name: 'UUID',
    description: 'UUID custom scalar type',
    serialize(value) {
        if (typeof value === 'string') {
            return value;
        }
        throw new Error('UUID must be a string');
    },
    parseValue(value) {
        if (typeof value === 'string') {
            return value;
        }
        throw new Error('UUID must be a string');
    },
    parseLiteral(ast) {
        if (ast.kind === graphql_1.Kind.STRING) {
            return ast.value;
        }
        throw new Error('UUID must be a string');
    },
});
// Helper functions
function mapIsolationLevel(level) {
    if (!level)
        return undefined;
    const mapping = {
        STANDARD: sandbox_tenant_profile_1.SandboxIsolationLevel.STANDARD,
        ENHANCED: sandbox_tenant_profile_1.SandboxIsolationLevel.ENHANCED,
        AIRGAPPED: sandbox_tenant_profile_1.SandboxIsolationLevel.AIRGAPPED,
        RESEARCH: sandbox_tenant_profile_1.SandboxIsolationLevel.RESEARCH,
    };
    return mapping[level];
}
function mapConnectorType(type) {
    if (!type)
        return undefined;
    const mapping = {
        DATABASE: sandbox_tenant_profile_1.ConnectorType.DATABASE,
        API: sandbox_tenant_profile_1.ConnectorType.API,
        FILE_SYSTEM: sandbox_tenant_profile_1.ConnectorType.FILE_SYSTEM,
        STREAMING: sandbox_tenant_profile_1.ConnectorType.STREAMING,
        EXTERNAL_SERVICE: sandbox_tenant_profile_1.ConnectorType.EXTERNAL_SERVICE,
        FEDERATION: sandbox_tenant_profile_1.ConnectorType.FEDERATION,
    };
    return mapping[type];
}
function mapCloneStrategy(strategy) {
    const mapping = {
        STRUCTURE_ONLY: datalab_service_1.CloneStrategy.STRUCTURE_ONLY,
        SYNTHETIC: datalab_service_1.CloneStrategy.SYNTHETIC,
        ANONYMIZED: datalab_service_1.CloneStrategy.ANONYMIZED,
        SAMPLED: datalab_service_1.CloneStrategy.SAMPLED,
        FUZZED: datalab_service_1.CloneStrategy.FUZZED,
    };
    return mapping[strategy] || datalab_service_1.CloneStrategy.SYNTHETIC;
}
function mapDataSourceType(type) {
    const mapping = {
        NEO4J: datalab_service_1.DataSourceType.NEO4J,
        POSTGRESQL: datalab_service_1.DataSourceType.POSTGRESQL,
        INVESTIGATION: datalab_service_1.DataSourceType.INVESTIGATION,
        ENTITY_SET: datalab_service_1.DataSourceType.ENTITY_SET,
        SCENARIO: datalab_service_1.DataSourceType.SCENARIO,
    };
    return mapping[type] || datalab_service_1.DataSourceType.NEO4J;
}
function mapAnonymizationTechnique(technique) {
    const mapping = {
        REDACTION: datalab_service_1.AnonymizationTechnique.REDACTION,
        HASHING: datalab_service_1.AnonymizationTechnique.HASHING,
        PSEUDONYMIZATION: datalab_service_1.AnonymizationTechnique.PSEUDONYMIZATION,
        GENERALIZATION: datalab_service_1.AnonymizationTechnique.GENERALIZATION,
        MASKING: datalab_service_1.AnonymizationTechnique.MASKING,
        NOISE_ADDITION: datalab_service_1.AnonymizationTechnique.NOISE_ADDITION,
        K_ANONYMITY: datalab_service_1.AnonymizationTechnique.K_ANONYMITY,
        DIFFERENTIAL_PRIVACY: datalab_service_1.AnonymizationTechnique.DIFFERENTIAL_PRIVACY,
    };
    return mapping[technique] || datalab_service_1.AnonymizationTechnique.REDACTION;
}
exports.resolvers = {
    DateTime: DateTimeScalar,
    JSON: JSONScalar,
    UUID: UUIDScalar,
    Query: {
        // Sandbox Profile Queries
        sandbox: async (_, { id }, context) => {
            const timer = index_js_1.metrics.resolverDuration.startTimer({ resolver: 'sandbox' });
            try {
                const profile = await configManager.getProfile(id);
                index_js_1.metrics.resolverCalls.inc({ resolver: 'sandbox', status: profile ? 'success' : 'not_found' });
                return profile;
            }
            finally {
                timer();
            }
        },
        sandboxes: async (_, { status, includeExpired, limit = 50, offset = 0 }, context) => {
            const timer = index_js_1.metrics.resolverDuration.startTimer({ resolver: 'sandboxes' });
            try {
                const profiles = await configManager.listProfiles(context.user.id, {
                    status: status,
                    includeExpired: includeExpired ?? false,
                });
                index_js_1.metrics.resolverCalls.inc({ resolver: 'sandboxes', status: 'success' });
                return profiles.slice(offset, offset + limit);
            }
            finally {
                timer();
            }
        },
        sandboxPresets: async () => {
            const presets = configManager.getAvailablePresets();
            return presets.map(p => ({
                name: p.name,
                description: p.description,
                isolationLevel: p.name === 'airgapped' ? 'AIRGAPPED' :
                    p.name === 'research' ? 'RESEARCH' :
                        p.name === 'dataLab' ? 'ENHANCED' : 'STANDARD',
                tenantType: p.name === 'dataLab' ? 'DATALAB' : 'SANDBOX',
            }));
        },
        validateSandbox: async (_, { id }, context) => {
            const profile = await configManager.getProfile(id);
            if (!profile) {
                throw new Error(`Sandbox not found: ${id}`);
            }
            const report = validator.validate(profile);
            return {
                valid: report.valid,
                findings: report.findings,
                timestamp: report.timestamp,
                profileId: report.profileId,
            };
        },
        checkEnforcement: async (_, { sandboxId, operation, connectorType, targetEndpoint, dataFields }, context) => {
            const profile = await configManager.getProfile(sandboxId);
            if (!profile) {
                throw new Error(`Sandbox not found: ${sandboxId}`);
            }
            const decision = await enforcer.enforce(profile, {
                sandboxId,
                userId: context.user.id,
                operation: operation,
                connectorType: mapConnectorType(connectorType),
                targetEndpoint: targetEndpoint ?? undefined,
                dataFields: dataFields ?? undefined,
            });
            return decision;
        },
        // Data Lab Queries
        dataClone: async (_, { id }) => {
            // Would fetch from persistence layer
            return null;
        },
        dataClones: async (_, { sandboxId, limit = 50, offset = 0 }) => {
            // Would fetch from persistence layer
            return [];
        },
        syntheticData: async (_, { id }) => {
            // Would fetch from persistence layer
            return null;
        },
        syntheticDataResults: async (_, { sandboxId, limit = 50, offset = 0 }) => {
            // Would fetch from persistence layer
            return [];
        },
        scenarioTemplates: async (_, { category }) => {
            const templates = await dataLabAPI.listScenarioTemplates(category?.toLowerCase());
            return templates;
        },
        scenarioTemplate: async (_, { id }) => {
            const template = await dataLabAPI.getScenarioTemplate(id);
            return template;
        },
        // Promotion Queries
        promotionRequest: async (_, { id }) => {
            const request = await promotionWorkflow.getRequest(id);
            return request;
        },
        promotionRequests: async (_, { sandboxId, status, limit = 50, offset = 0 }) => {
            const requests = await promotionWorkflow.listRequests(sandboxId);
            const filtered = status ? requests.filter(r => r.status === status) : requests;
            return filtered.slice(offset, offset + limit);
        },
        pendingReviews: async (_, { limit = 50, offset = 0 }, context) => {
            // Would filter by reviewer
            return [];
        },
        // Session Queries
        activeSession: async (_, { sandboxId }, context) => {
            // Would fetch from session store
            return null;
        },
        // Audit Queries
        linkbackAttempts: async (_, { sandboxId, limit = 100 }) => {
            const attempts = enforcer.getLinkbackAttempts(sandboxId, limit);
            return attempts;
        },
        // Health
        health: async () => {
            return {
                status: 'healthy',
                version: '1.0.0',
                uptime: Math.floor((Date.now() - startTime) / 1000),
                dependencies: [
                    { name: 'neo4j', status: 'healthy', latencyMs: 5 },
                    { name: 'postgres', status: 'healthy', latencyMs: 3 },
                    { name: 'redis', status: 'healthy', latencyMs: 1 },
                ],
            };
        },
    },
    Mutation: {
        // Sandbox Profile Mutations
        createSandbox: async (_, { input }, context) => {
            const timer = index_js_1.metrics.resolverDuration.startTimer({ resolver: 'createSandbox' });
            try {
                const profile = await configManager.createProfile({
                    name: input.name,
                    description: input.description ?? undefined,
                    parentTenantId: input.parentTenantId ?? undefined,
                    isolationLevel: mapIsolationLevel(input.isolationLevel),
                    resourceQuotas: input.resourceQuotas ?? undefined,
                    dataAccessPolicy: input.dataAccessPolicy ?? undefined,
                    expiresInDays: input.expiresInDays ?? 30,
                    teamIds: input.teamIds ?? undefined,
                    tags: input.tags ?? undefined,
                }, context.user.id, input.preset);
                index_js_1.metrics.sandboxCreated.inc({ isolation_level: profile.isolationLevel });
                logger.info('Sandbox created', { sandboxId: profile.id, userId: context.user.id });
                return profile;
            }
            finally {
                timer();
            }
        },
        updateSandbox: async (_, { id, input }, context) => {
            const profile = await configManager.updateProfile(id, input, context.user.id);
            return profile;
        },
        activateSandbox: async (_, { id }, context) => {
            const profile = await configManager.activateProfile(id);
            index_js_1.metrics.sandboxStatusChange.inc({ from: 'provisioning', to: 'active' });
            return profile;
        },
        suspendSandbox: async (_, { id, reason }, context) => {
            const profile = await configManager.suspendProfile(id, reason);
            index_js_1.metrics.sandboxStatusChange.inc({ from: 'active', to: 'suspended' });
            return profile;
        },
        resumeSandbox: async (_, { id }, context) => {
            const profile = await configManager.getProfile(id);
            if (!profile)
                throw new Error(`Sandbox not found: ${id}`);
            const updated = await configManager.updateProfile(id, { status: sandbox_tenant_profile_1.SandboxStatus.ACTIVE }, context.user.id);
            index_js_1.metrics.sandboxStatusChange.inc({ from: 'suspended', to: 'active' });
            return updated;
        },
        archiveSandbox: async (_, { id }, context) => {
            const profile = await configManager.archiveProfile(id);
            index_js_1.metrics.sandboxStatusChange.inc({ from: 'any', to: 'archived' });
            return profile;
        },
        deleteSandbox: async (_, { id }, context) => {
            // Would delete from persistence layer
            logger.warn('Sandbox deleted', { sandboxId: id, userId: context.user.id });
            return true;
        },
        extendSandbox: async (_, { id, days }, context) => {
            const profile = await configManager.getProfile(id);
            if (!profile)
                throw new Error(`Sandbox not found: ${id}`);
            const newExpiry = new Date(profile.expiresAt || new Date());
            newExpiry.setDate(newExpiry.getDate() + days);
            const updated = await configManager.updateProfile(id, { expiresAt: newExpiry }, context.user.id);
            return updated;
        },
        // Data Lab Mutations
        cloneData: async (_, { input }, context) => {
            const timer = index_js_1.metrics.resolverDuration.startTimer({ resolver: 'cloneData' });
            try {
                const profile = await configManager.getProfile(input.sandboxId);
                if (!profile)
                    throw new Error(`Sandbox not found: ${input.sandboxId}`);
                const result = await cloneService.clone({
                    id: (0, uuid_1.v4)(),
                    sandboxId: input.sandboxId,
                    name: input.name,
                    description: input.description ?? undefined,
                    sourceType: mapDataSourceType(input.sourceType),
                    sourceConfig: input.sourceConfig,
                    strategy: mapCloneStrategy(input.strategy),
                    fieldAnonymization: (input.fieldAnonymization || []).map(f => ({
                        fieldPath: f.fieldPath,
                        technique: mapAnonymizationTechnique(f.technique),
                        config: {
                            preserveFormat: f.preserveFormat ?? false,
                            preserveLength: f.preserveLength ?? false,
                            kValue: f.kValue ?? undefined,
                            epsilon: f.epsilon ?? undefined,
                            hashAlgorithm: f.hashAlgorithm ?? undefined,
                            maskChar: f.maskChar ?? '*',
                            maskFromStart: f.maskFromStart ?? 0,
                            maskFromEnd: f.maskFromEnd ?? 0,
                        },
                    })),
                    sampleSize: input.sampleSize ?? undefined,
                    sampleMethod: (input.sampleMethod ?? 'random'),
                    outputFormat: (input.outputFormat ?? 'neo4j'),
                    includeRelationships: input.includeRelationships ?? true,
                    preserveGraph: input.preserveGraph ?? true,
                    requestedBy: context.user.id,
                    requestedAt: new Date(),
                }, profile);
                index_js_1.metrics.dataCloneOperations.inc({ strategy: input.strategy, status: result.status });
                return result;
            }
            finally {
                timer();
            }
        },
        generateSyntheticData: async (_, { input }, context) => {
            const timer = index_js_1.metrics.resolverDuration.startTimer({ resolver: 'generateSyntheticData' });
            try {
                const result = await syntheticGenerator.generate({
                    sandboxId: input.sandboxId,
                    name: input.name,
                    schemas: input.schemas.map(s => ({
                        entityType: s.entityType,
                        fields: s.fields.map(f => ({
                            name: f.name,
                            type: f.type,
                            generator: f.generator,
                            config: (f.config || {}),
                            nullable: f.nullable ?? false,
                            nullProbability: f.nullProbability ?? 0,
                        })),
                        relationshipTypes: (s.relationshipTypes || []).map(r => ({
                            type: r.type,
                            targetEntityType: r.targetEntityType,
                            direction: r.direction,
                            probability: r.probability ?? 0.5,
                            minCount: r.minCount ?? 0,
                            maxCount: r.maxCount ?? 5,
                        })),
                    })),
                    config: {
                        totalEntities: input.config.totalEntities,
                        entityDistribution: input.config.entityDistribution,
                        seed: input.config.seed ?? undefined,
                        locale: input.config.locale ?? 'en',
                        generateRelationships: input.config.generateRelationships ?? true,
                        connectivityDensity: input.config.connectivityDensity ?? 0.3,
                    },
                    outputFormat: (input.outputFormat ?? 'neo4j'),
                    requestedBy: context.user.id,
                });
                index_js_1.metrics.syntheticDataGenerated.inc({ status: result.status });
                return result;
            }
            finally {
                timer();
            }
        },
        runScenario: async (_, { input }, context) => {
            const result = await dataLabAPI.runScenario({
                sandboxId: input.sandboxId,
                templateId: input.templateId,
                name: input.name,
                description: input.description ?? undefined,
                parameters: (input.parameters || {}),
                scale: input.scale ?? 1.0,
                seed: input.seed ?? undefined,
                outputFormat: (input.outputFormat ?? 'neo4j'),
                requestedBy: context.user.id,
            });
            return result;
        },
        executeSandboxQuery: async (_, { input }, context) => {
            const result = await dataLabAPI.executeQuery({
                sandboxId: input.sandboxId,
                query: input.query,
                queryType: input.queryType,
                parameters: (input.parameters || {}),
                timeout: input.timeout ?? 30000,
                limit: input.limit ?? 1000,
                requestedBy: context.user.id,
            });
            return result;
        },
        // Session Mutations
        startSession: async (_, { sandboxId }, context) => {
            const session = await dataLabAPI.startSession(sandboxId, context.user.id);
            return session;
        },
        endSession: async (_, { sessionId }, context) => {
            await dataLabAPI.endSession(sessionId);
            return true;
        },
        // Promotion Mutations
        createPromotionRequest: async (_, { input }, context) => {
            const request = await promotionWorkflow.createRequest(input.sandboxId, input.targetTenantId, context.user.id, {
                type: input.promotionType.toLowerCase(),
                id: input.artifactId,
                name: input.artifactName,
                version: input.artifactVersion ?? undefined,
            }, input.justification, input.rollbackPlan ?? undefined);
            return request;
        },
        submitForReview: async (_, { requestId, reviewers }, context) => {
            const request = await promotionWorkflow.submitForReview(requestId, reviewers);
            return request;
        },
        reviewPromotion: async (_, { input }, context) => {
            const request = await promotionWorkflow.addApproval(input.requestId, context.user.id, input.decision, input.comments ?? undefined);
            return request;
        },
        executePromotion: async (_, { requestId }, context) => {
            const request = await promotionWorkflow.executePromotion(requestId);
            index_js_1.metrics.promotionExecuted.inc({ status: 'success' });
            return request;
        },
        rollbackPromotion: async (_, { requestId, reason }, context) => {
            const request = await promotionWorkflow.rollback(requestId, reason);
            index_js_1.metrics.promotionExecuted.inc({ status: 'rolled_back' });
            return request;
        },
        cancelPromotion: async (_, { requestId }, context) => {
            // Would update status to cancelled
            const request = await promotionWorkflow.getRequest(requestId);
            return request;
        },
    },
    Subscription: {
        sandboxStatusChanged: {
            subscribe: async function* (_, { sandboxId }) {
                // Would use pub/sub system
                yield { sandboxStatusChanged: null };
            },
        },
        dataCloneProgress: {
            subscribe: async function* (_, { requestId }) {
                yield { dataCloneProgress: null };
            },
        },
        syntheticDataProgress: {
            subscribe: async function* (_, { requestId }) {
                yield { syntheticDataProgress: null };
            },
        },
        promotionStatusChanged: {
            subscribe: async function* (_, { requestId }) {
                yield { promotionStatusChanged: null };
            },
        },
        linkbackAlert: {
            subscribe: async function* (_, { sandboxId }) {
                yield { linkbackAlert: null };
            },
        },
    },
};
