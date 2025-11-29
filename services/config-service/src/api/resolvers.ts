import { GraphQLScalarType, Kind } from 'graphql';
import {
  configService,
  segmentService,
  featureFlagService,
  experimentService,
} from '../services/index.js';
import { auditRepository, type AuditContext } from '../db/index.js';
import { metrics } from '../utils/metrics.js';
import { logger } from '../utils/logger.js';
import type {
  ConfigContext,
  EvaluationContext,
  CreateConfigItemInput,
  UpdateConfigItemInput,
  CreateSegmentInput,
  CreateFeatureFlagInput,
  UpdateFeatureFlagInput,
  AddTargetingRuleInput,
  CreateExperimentInput,
  UpdateExperimentInput,
} from '../types/index.js';

const log = logger.child({ module: 'resolvers' });

// Custom scalars
const JSONScalar = new GraphQLScalarType({
  name: 'JSON',
  description: 'Arbitrary JSON value',
  serialize: (value) => value,
  parseValue: (value) => value,
  parseLiteral: (ast) => {
    if (ast.kind === Kind.STRING) {
      try {
        return JSON.parse(ast.value);
      } catch {
        return ast.value;
      }
    }
    if (ast.kind === Kind.INT) {
      return parseInt(ast.value, 10);
    }
    if (ast.kind === Kind.FLOAT) {
      return parseFloat(ast.value);
    }
    if (ast.kind === Kind.BOOLEAN) {
      return ast.value;
    }
    if (ast.kind === Kind.NULL) {
      return null;
    }
    if (ast.kind === Kind.LIST) {
      return ast.values.map((v) => JSONScalar.parseLiteral!(v, {}));
    }
    if (ast.kind === Kind.OBJECT) {
      const obj: Record<string, unknown> = {};
      ast.fields.forEach((field) => {
        obj[field.name.value] = JSONScalar.parseLiteral!(field.value, {});
      });
      return obj;
    }
    return null;
  },
});

const DateTimeScalar = new GraphQLScalarType({
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
    if (ast.kind === Kind.STRING) {
      return new Date(ast.value);
    }
    return null;
  },
});

interface ResolverContext {
  userId: string;
  userEmail?: string;
  tenantId?: string;
  ipAddress?: string;
  userAgent?: string;
}

function getAuditContext(ctx: ResolverContext): AuditContext {
  return {
    userId: ctx.userId,
    userEmail: ctx.userEmail,
    tenantId: ctx.tenantId,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
  };
}

export const resolvers = {
  JSON: JSONScalar,
  DateTime: DateTimeScalar,

  Query: {
    // Config queries
    config: async (_: unknown, { id }: { id: string }) => {
      return configService.getConfigById(id);
    },

    configValue: async (
      _: unknown,
      { key, context }: { key: string; context?: ConfigContext },
    ) => {
      const start = Date.now();
      const value = await configService.getConfig(key, context ?? {});
      metrics.configEvaluationDurationMs.observe({ key }, Date.now() - start);
      return value;
    },

    configs: async (
      _: unknown,
      args: { tenantId?: string; limit?: number; offset?: number },
    ) => {
      return configService.listConfigs(args.tenantId ?? null, {
        limit: args.limit,
        offset: args.offset,
      });
    },

    // Segment queries
    segment: async (_: unknown, { id }: { id: string }) => {
      return segmentService.getSegment(id);
    },

    segmentByName: async (
      _: unknown,
      { name, tenantId }: { name: string; tenantId?: string },
    ) => {
      return segmentService.getSegmentByName(name, tenantId ?? null);
    },

    segments: async (
      _: unknown,
      args: { tenantId?: string; limit?: number; offset?: number },
    ) => {
      return segmentService.listSegments(args.tenantId ?? null, {
        limit: args.limit,
        offset: args.offset,
      });
    },

    // Feature flag queries
    flag: async (_: unknown, { id }: { id: string }) => {
      return featureFlagService.getFlag(id);
    },

    flagByKey: async (
      _: unknown,
      { key, tenantId }: { key: string; tenantId?: string },
    ) => {
      return featureFlagService.getFlagByKey(key, tenantId ?? null);
    },

    flags: async (
      _: unknown,
      args: {
        tenantId?: string;
        limit?: number;
        offset?: number;
        includeGlobal?: boolean;
      },
    ) => {
      return featureFlagService.listFlags(args.tenantId ?? null, {
        limit: args.limit,
        offset: args.offset,
        includeGlobal: args.includeGlobal,
      });
    },

    evaluateFlag: async (
      _: unknown,
      { flagKey, context }: { flagKey: string; context: EvaluationContext },
    ) => {
      const start = Date.now();
      const result = await featureFlagService.evaluate(flagKey, context);
      const duration = Date.now() - start;

      metrics.flagEvaluationDurationMs.observe({ flag_key: flagKey }, duration);
      metrics.flagEvaluationsTotal.inc({
        flag_key: flagKey,
        result: result.enabled ? 'enabled' : 'disabled',
        reason: result.reason,
        tenant_id: context.tenantId ?? 'global',
      });

      return result;
    },

    // Experiment queries
    experiment: async (_: unknown, { id }: { id: string }) => {
      return experimentService.getExperiment(id);
    },

    experimentByKey: async (
      _: unknown,
      { key, tenantId }: { key: string; tenantId?: string },
    ) => {
      return experimentService.getExperimentByKey(key, tenantId ?? null);
    },

    experiments: async (
      _: unknown,
      args: {
        tenantId?: string;
        status?: string;
        limit?: number;
        offset?: number;
        includeGlobal?: boolean;
      },
    ) => {
      return experimentService.listExperiments(args.tenantId ?? null, {
        status: args.status as any,
        limit: args.limit,
        offset: args.offset,
        includeGlobal: args.includeGlobal,
      });
    },

    getExperimentAssignment: async (
      _: unknown,
      {
        experimentKey,
        context,
      }: { experimentKey: string; context: EvaluationContext },
    ) => {
      const start = Date.now();
      const result = await experimentService.getAssignment(experimentKey, context);
      const duration = Date.now() - start;

      metrics.experimentAssignmentDurationMs.observe(
        { experiment_key: experimentKey },
        duration,
      );
      metrics.experimentAssignmentsTotal.inc({
        experiment_key: experimentKey,
        variant: result.variantName,
        reason: result.reason,
        tenant_id: context.tenantId ?? 'global',
      });

      return result;
    },

    // Batch evaluation
    batchEvaluate: async (
      _: unknown,
      args: {
        context: EvaluationContext;
        flagKeys?: string[];
        experimentKeys?: string[];
        configKeys?: string[];
      },
    ) => {
      const { context, flagKeys, experimentKeys, configKeys } = args;

      const [flags, experiments, configs] = await Promise.all([
        flagKeys
          ? featureFlagService.evaluateBatch(flagKeys, context)
          : Promise.resolve({}),
        experimentKeys
          ? experimentService.getAssignments(experimentKeys, context)
          : Promise.resolve({}),
        configKeys
          ? configService.getConfigs(configKeys, context)
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
    auditLog: async (
      _: unknown,
      args: {
        entityType?: string;
        entityId?: string;
        tenantId?: string;
        limit?: number;
        offset?: number;
      },
    ) => {
      if (args.entityType && args.entityId) {
        return auditRepository.getEntityHistory(
          args.entityType as any,
          args.entityId,
          { limit: args.limit, offset: args.offset },
        );
      }
      return auditRepository.getByTenant(args.tenantId ?? null, {
        entityType: args.entityType as any,
        limit: args.limit,
        offset: args.offset,
      });
    },
  },

  Mutation: {
    // Config mutations
    createConfig: async (
      _: unknown,
      { input }: { input: CreateConfigItemInput },
      ctx: ResolverContext,
    ) => {
      const result = await configService.setConfig(input, getAuditContext(ctx));
      metrics.auditEventsTotal.inc({ entity_type: 'config', action: 'create' });
      return result;
    },

    updateConfig: async (
      _: unknown,
      { id, input }: { id: string; input: UpdateConfigItemInput },
      ctx: ResolverContext,
    ) => {
      const result = await configService.updateConfig(
        id,
        input,
        getAuditContext(ctx),
      );
      if (result) {
        metrics.auditEventsTotal.inc({ entity_type: 'config', action: 'update' });
      }
      return result;
    },

    deleteConfig: async (
      _: unknown,
      { id }: { id: string },
      ctx: ResolverContext,
    ) => {
      const result = await configService.deleteConfig(id, getAuditContext(ctx));
      if (result) {
        metrics.auditEventsTotal.inc({ entity_type: 'config', action: 'delete' });
      }
      return result;
    },

    // Segment mutations
    createSegment: async (
      _: unknown,
      { input }: { input: CreateSegmentInput },
      ctx: ResolverContext,
    ) => {
      const result = await segmentService.createSegment(
        input,
        getAuditContext(ctx),
      );
      metrics.auditEventsTotal.inc({ entity_type: 'segment', action: 'create' });
      return result;
    },

    updateSegment: async (
      _: unknown,
      { id, input }: { id: string; input: Partial<CreateSegmentInput> },
      ctx: ResolverContext,
    ) => {
      const result = await segmentService.updateSegment(
        id,
        input,
        getAuditContext(ctx),
      );
      if (result) {
        metrics.auditEventsTotal.inc({ entity_type: 'segment', action: 'update' });
      }
      return result;
    },

    deleteSegment: async (
      _: unknown,
      { id }: { id: string },
      ctx: ResolverContext,
    ) => {
      const result = await segmentService.deleteSegment(
        id,
        getAuditContext(ctx),
      );
      if (result) {
        metrics.auditEventsTotal.inc({ entity_type: 'segment', action: 'delete' });
      }
      return result;
    },

    // Feature flag mutations
    createFlag: async (
      _: unknown,
      { input }: { input: CreateFeatureFlagInput },
      ctx: ResolverContext,
    ) => {
      const result = await featureFlagService.createFlag(
        input,
        getAuditContext(ctx),
      );
      metrics.auditEventsTotal.inc({ entity_type: 'flag', action: 'create' });
      return result;
    },

    updateFlag: async (
      _: unknown,
      { id, input }: { id: string; input: UpdateFeatureFlagInput },
      ctx: ResolverContext,
    ) => {
      const result = await featureFlagService.updateFlag(
        id,
        input,
        getAuditContext(ctx),
      );
      if (result) {
        metrics.auditEventsTotal.inc({ entity_type: 'flag', action: 'update' });
      }
      return result;
    },

    deleteFlag: async (
      _: unknown,
      { id }: { id: string },
      ctx: ResolverContext,
    ) => {
      const result = await featureFlagService.deleteFlag(
        id,
        getAuditContext(ctx),
      );
      if (result) {
        metrics.auditEventsTotal.inc({ entity_type: 'flag', action: 'delete' });
      }
      return result;
    },

    toggleFlag: async (
      _: unknown,
      { id, enabled }: { id: string; enabled: boolean },
      ctx: ResolverContext,
    ) => {
      const result = await featureFlagService.toggleFlag(
        id,
        enabled,
        getAuditContext(ctx),
      );
      if (result) {
        metrics.auditEventsTotal.inc({
          entity_type: 'flag',
          action: enabled ? 'enable' : 'disable',
        });
      }
      return result;
    },

    addTargetingRule: async (
      _: unknown,
      { flagId, input }: { flagId: string; input: AddTargetingRuleInput },
      ctx: ResolverContext,
    ) => {
      const result = await featureFlagService.addTargetingRule(
        flagId,
        input,
        getAuditContext(ctx),
      );
      if (result) {
        metrics.auditEventsTotal.inc({ entity_type: 'flag', action: 'update' });
      }
      return result;
    },

    removeTargetingRule: async (
      _: unknown,
      { flagId, ruleId }: { flagId: string; ruleId: string },
      ctx: ResolverContext,
    ) => {
      const result = await featureFlagService.removeTargetingRule(
        flagId,
        ruleId,
        getAuditContext(ctx),
      );
      if (result) {
        metrics.auditEventsTotal.inc({ entity_type: 'flag', action: 'update' });
      }
      return result;
    },

    // Experiment mutations
    createExperiment: async (
      _: unknown,
      { input }: { input: CreateExperimentInput },
      ctx: ResolverContext,
    ) => {
      const result = await experimentService.createExperiment(
        input,
        getAuditContext(ctx),
      );
      metrics.auditEventsTotal.inc({
        entity_type: 'experiment',
        action: 'create',
      });
      return result;
    },

    updateExperiment: async (
      _: unknown,
      { id, input }: { id: string; input: UpdateExperimentInput },
      ctx: ResolverContext,
    ) => {
      const result = await experimentService.updateExperiment(
        id,
        input,
        getAuditContext(ctx),
      );
      if (result) {
        metrics.auditEventsTotal.inc({
          entity_type: 'experiment',
          action: 'update',
        });
      }
      return result;
    },

    deleteExperiment: async (
      _: unknown,
      { id }: { id: string },
      ctx: ResolverContext,
    ) => {
      const result = await experimentService.deleteExperiment(
        id,
        getAuditContext(ctx),
      );
      if (result) {
        metrics.auditEventsTotal.inc({
          entity_type: 'experiment',
          action: 'delete',
        });
      }
      return result;
    },

    startExperiment: async (
      _: unknown,
      { id }: { id: string },
      ctx: ResolverContext,
    ) => {
      const result = await experimentService.startExperiment(
        id,
        getAuditContext(ctx),
      );
      if (result) {
        metrics.auditEventsTotal.inc({
          entity_type: 'experiment',
          action: 'start',
        });
      }
      return result;
    },

    pauseExperiment: async (
      _: unknown,
      { id }: { id: string },
      ctx: ResolverContext,
    ) => {
      const result = await experimentService.pauseExperiment(
        id,
        getAuditContext(ctx),
      );
      if (result) {
        metrics.auditEventsTotal.inc({
          entity_type: 'experiment',
          action: 'pause',
        });
      }
      return result;
    },

    completeExperiment: async (
      _: unknown,
      { id }: { id: string },
      ctx: ResolverContext,
    ) => {
      const result = await experimentService.completeExperiment(
        id,
        getAuditContext(ctx),
      );
      if (result) {
        metrics.auditEventsTotal.inc({
          entity_type: 'experiment',
          action: 'complete',
        });
      }
      return result;
    },

    approveExperiment: async (
      _: unknown,
      { id }: { id: string },
      ctx: ResolverContext,
    ) => {
      const result = await experimentService.approveExperiment(
        id,
        getAuditContext(ctx),
      );
      if (result) {
        metrics.auditEventsTotal.inc({
          entity_type: 'experiment',
          action: 'approve',
        });
      }
      return result;
    },
  },
};
