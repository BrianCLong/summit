"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolvers = void 0;
const graphql_1 = require("graphql");
const index_js_1 = require("../services/index.js");
const index_js_2 = require("../db/index.js");
const metrics_js_1 = require("../utils/metrics.js");
const logger_js_1 = require("../utils/logger.js");
const log = logger_js_1.logger.child({ module: 'resolvers' });
// Custom scalars
const JSONScalar = new graphql_1.GraphQLScalarType({
    name: 'JSON',
    description: 'Arbitrary JSON value',
    serialize: (value) => value,
    parseValue: (value) => value,
    parseLiteral: (ast) => {
        if (ast.kind === graphql_1.Kind.STRING) {
            try {
                return JSON.parse(ast.value);
            }
            catch {
                return ast.value;
            }
        }
        if (ast.kind === graphql_1.Kind.INT) {
            return parseInt(ast.value, 10);
        }
        if (ast.kind === graphql_1.Kind.FLOAT) {
            return parseFloat(ast.value);
        }
        if (ast.kind === graphql_1.Kind.BOOLEAN) {
            return ast.value;
        }
        if (ast.kind === graphql_1.Kind.NULL) {
            return null;
        }
        if (ast.kind === graphql_1.Kind.LIST) {
            return ast.values.map((v) => JSONScalar.parseLiteral(v, {}));
        }
        if (ast.kind === graphql_1.Kind.OBJECT) {
            const obj = {};
            ast.fields.forEach((field) => {
                obj[field.name.value] = JSONScalar.parseLiteral(field.value, {});
            });
            return obj;
        }
        return null;
    },
});
const DateTimeScalar = new graphql_1.GraphQLScalarType({
    name: 'DateTime',
    description: 'ISO-8601 formatted date-time string',
    serialize: (value) => {
        if (value instanceof Date) {
            return value.toISOString();
        }
        return value;
    },
    parseValue: (value) => {
        if (typeof value === 'string') {
            return new Date(value);
        }
        return value;
    },
    parseLiteral: (ast) => {
        if (ast.kind === graphql_1.Kind.STRING) {
            return new Date(ast.value);
        }
        return null;
    },
});
function getAuditContext(ctx) {
    return {
        userId: ctx.userId,
        userEmail: ctx.userEmail,
        tenantId: ctx.tenantId,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
    };
}
exports.resolvers = {
    JSON: JSONScalar,
    DateTime: DateTimeScalar,
    Query: {
        // Config queries
        config: async (_, { id }) => {
            return index_js_1.configService.getConfigById(id);
        },
        configValue: async (_, { key, context }) => {
            const start = Date.now();
            const value = await index_js_1.configService.getConfig(key, context ?? {});
            metrics_js_1.metrics.configEvaluationDurationMs.observe({ key }, Date.now() - start);
            return value;
        },
        configs: async (_, args) => {
            return index_js_1.configService.listConfigs(args.tenantId ?? null, {
                limit: args.limit,
                offset: args.offset,
            });
        },
        // Segment queries
        segment: async (_, { id }) => {
            return index_js_1.segmentService.getSegment(id);
        },
        segmentByName: async (_, { name, tenantId }) => {
            return index_js_1.segmentService.getSegmentByName(name, tenantId ?? null);
        },
        segments: async (_, args) => {
            return index_js_1.segmentService.listSegments(args.tenantId ?? null, {
                limit: args.limit,
                offset: args.offset,
            });
        },
        // Feature flag queries
        flag: async (_, { id }) => {
            return index_js_1.featureFlagService.getFlag(id);
        },
        flagByKey: async (_, { key, tenantId }) => {
            return index_js_1.featureFlagService.getFlagByKey(key, tenantId ?? null);
        },
        flags: async (_, args) => {
            return index_js_1.featureFlagService.listFlags(args.tenantId ?? null, {
                limit: args.limit,
                offset: args.offset,
                includeGlobal: args.includeGlobal,
            });
        },
        evaluateFlag: async (_, { flagKey, context }) => {
            const start = Date.now();
            const result = await index_js_1.featureFlagService.evaluate(flagKey, context);
            const duration = Date.now() - start;
            metrics_js_1.metrics.flagEvaluationDurationMs.observe({ flag_key: flagKey }, duration);
            metrics_js_1.metrics.flagEvaluationsTotal.inc({
                flag_key: flagKey,
                result: result.enabled ? 'enabled' : 'disabled',
                reason: result.reason,
                tenant_id: context.tenantId ?? 'global',
            });
            return result;
        },
        // Experiment queries
        experiment: async (_, { id }) => {
            return index_js_1.experimentService.getExperiment(id);
        },
        experimentByKey: async (_, { key, tenantId }) => {
            return index_js_1.experimentService.getExperimentByKey(key, tenantId ?? null);
        },
        experiments: async (_, args) => {
            return index_js_1.experimentService.listExperiments(args.tenantId ?? null, {
                status: args.status,
                limit: args.limit,
                offset: args.offset,
                includeGlobal: args.includeGlobal,
            });
        },
        getExperimentAssignment: async (_, { experimentKey, context, }) => {
            const start = Date.now();
            const result = await index_js_1.experimentService.getAssignment(experimentKey, context);
            const duration = Date.now() - start;
            metrics_js_1.metrics.experimentAssignmentDurationMs.observe({ experiment_key: experimentKey }, duration);
            metrics_js_1.metrics.experimentAssignmentsTotal.inc({
                experiment_key: experimentKey,
                variant: result.variantName,
                reason: result.reason,
                tenant_id: context.tenantId ?? 'global',
            });
            return result;
        },
        // Batch evaluation
        batchEvaluate: async (_, args) => {
            const { context, flagKeys, experimentKeys, configKeys } = args;
            const [flags, experiments, configs] = await Promise.all([
                flagKeys
                    ? index_js_1.featureFlagService.evaluateBatch(flagKeys, context)
                    : Promise.resolve({}),
                experimentKeys
                    ? index_js_1.experimentService.getAssignments(experimentKeys, context)
                    : Promise.resolve({}),
                configKeys
                    ? index_js_1.configService.getConfigs(configKeys, context)
                    : Promise.resolve({}),
            ]);
            return {
                flags,
                experiments,
                configs,
                evaluatedAt: Date.now(),
            };
        },
        // Audit queries
        auditLog: async (_, args) => {
            if (args.entityType && args.entityId) {
                return index_js_2.auditRepository.getEntityHistory(args.entityType, args.entityId, { limit: args.limit, offset: args.offset });
            }
            return index_js_2.auditRepository.getByTenant(args.tenantId ?? null, {
                entityType: args.entityType,
                limit: args.limit,
                offset: args.offset,
            });
        },
    },
    Mutation: {
        // Config mutations
        createConfig: async (_, { input }, ctx) => {
            const result = await index_js_1.configService.setConfig(input, getAuditContext(ctx));
            metrics_js_1.metrics.auditEventsTotal.inc({ entity_type: 'config', action: 'create' });
            return result;
        },
        updateConfig: async (_, { id, input }, ctx) => {
            const result = await index_js_1.configService.updateConfig(id, input, getAuditContext(ctx));
            if (result) {
                metrics_js_1.metrics.auditEventsTotal.inc({ entity_type: 'config', action: 'update' });
            }
            return result;
        },
        deleteConfig: async (_, { id }, ctx) => {
            const result = await index_js_1.configService.deleteConfig(id, getAuditContext(ctx));
            if (result) {
                metrics_js_1.metrics.auditEventsTotal.inc({ entity_type: 'config', action: 'delete' });
            }
            return result;
        },
        // Segment mutations
        createSegment: async (_, { input }, ctx) => {
            const result = await index_js_1.segmentService.createSegment(input, getAuditContext(ctx));
            metrics_js_1.metrics.auditEventsTotal.inc({ entity_type: 'segment', action: 'create' });
            return result;
        },
        updateSegment: async (_, { id, input }, ctx) => {
            const result = await index_js_1.segmentService.updateSegment(id, input, getAuditContext(ctx));
            if (result) {
                metrics_js_1.metrics.auditEventsTotal.inc({ entity_type: 'segment', action: 'update' });
            }
            return result;
        },
        deleteSegment: async (_, { id }, ctx) => {
            const result = await index_js_1.segmentService.deleteSegment(id, getAuditContext(ctx));
            if (result) {
                metrics_js_1.metrics.auditEventsTotal.inc({ entity_type: 'segment', action: 'delete' });
            }
            return result;
        },
        // Feature flag mutations
        createFlag: async (_, { input }, ctx) => {
            const result = await index_js_1.featureFlagService.createFlag(input, getAuditContext(ctx));
            metrics_js_1.metrics.auditEventsTotal.inc({ entity_type: 'flag', action: 'create' });
            return result;
        },
        updateFlag: async (_, { id, input }, ctx) => {
            const result = await index_js_1.featureFlagService.updateFlag(id, input, getAuditContext(ctx));
            if (result) {
                metrics_js_1.metrics.auditEventsTotal.inc({ entity_type: 'flag', action: 'update' });
            }
            return result;
        },
        deleteFlag: async (_, { id }, ctx) => {
            const result = await index_js_1.featureFlagService.deleteFlag(id, getAuditContext(ctx));
            if (result) {
                metrics_js_1.metrics.auditEventsTotal.inc({ entity_type: 'flag', action: 'delete' });
            }
            return result;
        },
        toggleFlag: async (_, { id, enabled }, ctx) => {
            const result = await index_js_1.featureFlagService.toggleFlag(id, enabled, getAuditContext(ctx));
            if (result) {
                metrics_js_1.metrics.auditEventsTotal.inc({
                    entity_type: 'flag',
                    action: enabled ? 'enable' : 'disable',
                });
            }
            return result;
        },
        addTargetingRule: async (_, { flagId, input }, ctx) => {
            const result = await index_js_1.featureFlagService.addTargetingRule(flagId, input, getAuditContext(ctx));
            if (result) {
                metrics_js_1.metrics.auditEventsTotal.inc({ entity_type: 'flag', action: 'update' });
            }
            return result;
        },
        removeTargetingRule: async (_, { flagId, ruleId }, ctx) => {
            const result = await index_js_1.featureFlagService.removeTargetingRule(flagId, ruleId, getAuditContext(ctx));
            if (result) {
                metrics_js_1.metrics.auditEventsTotal.inc({ entity_type: 'flag', action: 'update' });
            }
            return result;
        },
        // Experiment mutations
        createExperiment: async (_, { input }, ctx) => {
            const result = await index_js_1.experimentService.createExperiment(input, getAuditContext(ctx));
            metrics_js_1.metrics.auditEventsTotal.inc({
                entity_type: 'experiment',
                action: 'create',
            });
            return result;
        },
        updateExperiment: async (_, { id, input }, ctx) => {
            const result = await index_js_1.experimentService.updateExperiment(id, input, getAuditContext(ctx));
            if (result) {
                metrics_js_1.metrics.auditEventsTotal.inc({
                    entity_type: 'experiment',
                    action: 'update',
                });
            }
            return result;
        },
        deleteExperiment: async (_, { id }, ctx) => {
            const result = await index_js_1.experimentService.deleteExperiment(id, getAuditContext(ctx));
            if (result) {
                metrics_js_1.metrics.auditEventsTotal.inc({
                    entity_type: 'experiment',
                    action: 'delete',
                });
            }
            return result;
        },
        startExperiment: async (_, { id }, ctx) => {
            const result = await index_js_1.experimentService.startExperiment(id, getAuditContext(ctx));
            if (result) {
                metrics_js_1.metrics.auditEventsTotal.inc({
                    entity_type: 'experiment',
                    action: 'start',
                });
            }
            return result;
        },
        pauseExperiment: async (_, { id }, ctx) => {
            const result = await index_js_1.experimentService.pauseExperiment(id, getAuditContext(ctx));
            if (result) {
                metrics_js_1.metrics.auditEventsTotal.inc({
                    entity_type: 'experiment',
                    action: 'pause',
                });
            }
            return result;
        },
        completeExperiment: async (_, { id }, ctx) => {
            const result = await index_js_1.experimentService.completeExperiment(id, getAuditContext(ctx));
            if (result) {
                metrics_js_1.metrics.auditEventsTotal.inc({
                    entity_type: 'experiment',
                    action: 'complete',
                });
            }
            return result;
        },
        approveExperiment: async (_, { id }, ctx) => {
            const result = await index_js_1.experimentService.approveExperiment(id, getAuditContext(ctx));
            if (result) {
                metrics_js_1.metrics.auditEventsTotal.inc({
                    entity_type: 'experiment',
                    action: 'approve',
                });
            }
            return result;
        },
    },
};
