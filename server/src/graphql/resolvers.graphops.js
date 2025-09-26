const Joi = require('joi');
const { v4: uuid } = require('uuid');
const { getRedisClient } = require('../config/database');
const GraphOpsService = require('../services/GraphOpsService');
const TagService = require('../services/TagService');
const { enqueueAIRequest } = require('../services/AIQueueService');
const { metrics } = require('../monitoring/metrics');
const { NeighborhoodCache } = require('../services/neighborhood-cache.js');

const expandSchema = Joi.object({
  entityId: Joi.string().trim().min(1).required(),
  limit: Joi.number().integer().min(1).max(200).default(50),
});

const neighborhoodSchema = Joi.object({
  entityId: Joi.string().trim().min(1).required(),
  investigationId: Joi.string().trim().min(1).required(),
  radius: Joi.number().integer().min(1).max(3).default(1),
});

const tagSchema = Joi.object({
  entityId: Joi.string()
    .trim()
    .pattern(/^[A-Za-z0-9:_-]{1,48}$/)
    .required(),
  tag: Joi.string().trim().min(1).max(50).required(),
  lastModifiedAt: Joi.date().iso().optional(), // Optional for initial creation, required for updates
});

const aiSchema = Joi.object({
  entityId: Joi.string().trim().min(1).required(),
});

const propertyValueSchema = Joi.alternatives().try(
  Joi.string(),
  Joi.number(),
  Joi.boolean(),
  Joi.date(),
  Joi.array().items(Joi.any()).max(100),
  Joi.object().pattern(/.*/, Joi.any()).max(50),
  Joi.valid(null),
);

const propertiesSchema = Joi.object()
  .pattern(/^[A-Za-z0-9:_-]+$/, propertyValueSchema)
  .max(200)
  .default({});

const batchNodeSchema = Joi.object({
  id: Joi.string().trim().min(1).required(),
  tenantId: Joi.string().trim().min(1).required(),
  type: Joi.string().trim().min(1).required(),
  label: Joi.string().trim().min(1).required(),
  investigationId: Joi.string().trim().optional(),
  tags: Joi.array().items(Joi.string().trim().min(1)).max(200).optional(),
  properties: propertiesSchema.optional(),
});

const batchEdgeSchema = Joi.object({
  id: Joi.string().trim().min(1).optional(),
  tenantId: Joi.string().trim().min(1).required(),
  type: Joi.string().trim().min(1).required(),
  label: Joi.string().trim().allow('', null).optional(),
  sourceId: Joi.string().trim().min(1).required(),
  targetId: Joi.string().trim().min(1).required(),
  investigationId: Joi.string().trim().optional(),
  properties: propertiesSchema.optional(),
});

const deleteNodeSchema = Joi.object({
  id: Joi.string().trim().min(1).required(),
  tenantId: Joi.string().trim().min(1).required(),
});

const deleteEdgeSchema = Joi.object({
  id: Joi.string().trim().min(1).required(),
  tenantId: Joi.string().trim().min(1).required(),
});

const batchInputSchema = Joi.object({
  createNodes: Joi.array().items(batchNodeSchema).max(10000).default([]),
  createEdges: Joi.array().items(batchEdgeSchema).max(10000).default([]),
  deleteNodes: Joi.array().items(deleteNodeSchema).max(10000).default([]),
  deleteEdges: Joi.array().items(deleteEdgeSchema).max(10000).default([]),
});

function ensureRole(user, allowedRoles = []) {
  if (!user) throw new Error('Not authenticated');
  if (allowedRoles.length === 0) return true;
  const role = (user.role || '').toUpperCase();
  if (!allowedRoles.map((r) => r.toUpperCase()).includes(role)) {
    const err = new Error('Forbidden');
    err.code = 'FORBIDDEN';
    throw err;
  }
}

function traceId() {
  return uuid();
}

const resolvers = {
  Mutation: {
    expandNeighbors: async (_, args, { user, logger }) => {
      const start = Date.now();
      const tId = traceId();
      const { value, error } = expandSchema.validate(args);
      if (error) {
        const err = new Error(`Invalid input: ${error.message}`);
        err.code = 'BAD_USER_INPUT';
        err.traceId = tId;
        throw err;
      }

      ensureRole(user, ['VIEWER', 'ANALYST', 'ADMIN']);
      // Role-based cap
      const role = (user.role || '').toUpperCase();
      const maxCaps = { VIEWER: 50, ANALYST: 100, ADMIN: 200 };
      const cap = maxCaps[role] || 50;
      const limit = Math.min(value.limit, cap);

      const redis = getRedisClient();
      // simple per-user rate limit
      try {
        const rlKey = `rl:expand:${user?.id || 'anon'}`;
        const cnt = await redis.incr(rlKey);
        if (cnt === 1) await redis.expire(rlKey, 60);
        if (cnt > (Number(process.env.RL_EXPAND_PER_MIN) || 120)) {
          const err = new Error('Rate limit exceeded');
          err.code = 'RATE_LIMITED';
          err.traceId = tId;
          throw err;
        }
      } catch (_) {
        /* Intentionally empty */
      }
      const cacheKey = `expand:${value.entityId}:${limit}:${role}`;
      let cached = null;
      try {
        cached = await redis.get(cacheKey);
      } catch (_) {
        /* Intentionally empty */
      }
      if (cached) {
        metrics.graphExpandRequestsTotal.labels('true').inc();
        return JSON.parse(cached);
      }

      metrics.graphExpandRequestsTotal.labels('false').inc();

      // Single-flight lock to prevent stampede
      const lockKey = `lock:${cacheKey}`;
      let haveLock = false;
      try {
        haveLock = (await redis.set(lockKey, '1', 'NX', 'EX', 10)) === 'OK';
      } catch (_) {
        /* Intentionally empty */
      }

      try {
        const result = await GraphOpsService.expandNeighbors(value.entityId, limit, {
          traceId: tId,
        });

        // Read-through cache, short TTL
        const ttl =
          process.env.GRAPH_EXPAND_CACHE === '0'
            ? 0
            : Number(process.env.GRAPH_EXPAND_TTL_SEC) || 120;
        if (ttl > 0) {
          try {
            await redis.set(cacheKey, JSON.stringify(result), 'EX', ttl);
          } catch (_) {
            /* Intentionally empty */
          }
        }

        metrics.resolverLatencyMs.labels('expandNeighbors').observe(Date.now() - start);
        return result;
      } catch (e) {
        logger.error('expandNeighbors error', { err: e, traceId: tId });
        const err = new Error('EXPAND_FAILED');
        err.code = 'EXPAND_FAILED';
        err.details = e.message;
        err.traceId = tId;
        throw err;
      }
    },

    expandNeighborhood: async (_, args, { user, logger }) => {
      const start = Date.now();
      const tId = traceId();
      const { value, error } = neighborhoodSchema.validate(args);
      if (error) {
        const err = new Error(`Invalid input: ${error.message}`);
        err.code = 'BAD_USER_INPUT';
        err.traceId = tId;
        throw err;
      }

      ensureRole(user, ['VIEWER', 'ANALYST', 'ADMIN']);
      const tenantId = user?.tenantId || 'default';
      const cache = new NeighborhoodCache(
        getRedisClient(),
        Number(process.env.NEIGHBORHOOD_CACHE_TTL_SEC) || 300,
      );
      const cached = await cache.get(tenantId, value.investigationId, value.entityId, value.radius);
      if (cached) {
        return cached;
      }

      try {
        const result = await GraphOpsService.expandNeighborhood(value.entityId, value.radius, {
          tenantId,
          investigationId: value.investigationId,
          traceId: tId,
        });
        await cache.set(tenantId, value.investigationId, value.entityId, value.radius, result);
        metrics.resolverLatencyMs.labels('expandNeighborhood').observe(Date.now() - start);
        return result;
      } catch (e) {
        logger.error('expandNeighborhood error', { err: e, traceId: tId });
        const err = new Error('EXPAND_NEIGHBORHOOD_FAILED');
        err.code = 'EXPAND_NEIGHBORHOOD_FAILED';
        err.details = e.message;
        err.traceId = tId;
        throw err;
      }
    },

    tagEntity: async (_, args, { user, logger }) => {
      const tId = traceId();
      const { value, error } = tagSchema.validate(args);
      if (error) {
        const err = new Error(`Invalid input: ${error.message}`);
        err.code = 'BAD_USER_INPUT';
        err.traceId = tId;
        throw err;
      }
      ensureRole(user, ['ANALYST', 'ADMIN']);

      try {
        const entity = await TagService.addTag(value.entityId, value.tag, value.lastModifiedAt, {
          user,
          traceId: tId,
        });

        // Cache bust for relevant expand keys for this entity across roles
        const redis = getRedisClient();
        const roles = ['VIEWER', 'ANALYST', 'ADMIN'];
        await Promise.all(
          roles
            .map((r) => redis.keys(`expand:${value.entityId}:*:${r}`))
            .map(async (p) => {
              const keys = await p;
              if (keys && keys.length) {
                await redis.del(keys);
              } /* Intentionally empty */
            }),
        );

        return entity;
      } catch (e) {
        logger.error('tagEntity error', { err: e, traceId: tId });
        const err = new Error('TAG_FAILED');
        err.code = 'TAG_FAILED';
        err.details = e.message;
        err.traceId = tId;
        throw err;
      }
    },

    deleteTag: async (_, args, { user, logger }) => {
      const tId = traceId();
      const { value, error } = tagSchema.validate(args);
      if (error) {
        const err = new Error(`Invalid input: ${error.message}`);
        err.code = 'BAD_USER_INPUT';
        err.traceId = tId;
        throw err;
      }
      ensureRole(user, ['ANALYST', 'ADMIN']);

      try {
        const entity = await TagService.deleteTag(value.entityId, value.tag, {
          user,
          traceId: tId,
        });

        // Cache bust for relevant expand keys for this entity across roles
        const redis = getRedisClient();
        const roles = ['VIEWER', 'ANALYST', 'ADMIN'];
        await Promise.all(
          roles
            .map((r) => redis.keys(`expand:${value.entityId}:*:${r}`))
            .map(async (p) => {
              const keys = await p;
              if (keys && keys.length) {
                await redis.del(keys);
              } /* Intentionally empty */
            }),
        );

        return entity;
      } catch (e) {
        logger.error('deleteTag error', { err: e, traceId: tId });
        const err = new Error('DELETE_TAG_FAILED');
        err.code = 'DELETE_TAG_FAILED';
        err.details = e.message;
        err.traceId = tId;
        throw err;
      }
    },

    requestAIAnalysis: async (_, args, { user, logger }) => {
      const tId = traceId();
      const { value, error } = aiSchema.validate(args);
      if (error) {
        const err = new Error(`Invalid input: ${error.message}`);
        err.code = 'BAD_USER_INPUT';
        err.traceId = tId;
        throw err;
      }
      ensureRole(user, ['ANALYST', 'ADMIN']);

      if (String(process.env.AI_REQUEST_ENABLED || '1') === '0') {
        const err = new Error('AI requests disabled');
        err.code = 'FEATURE_DISABLED';
        err.traceId = tId;
        throw err;
      }

      try {
        const reqId = await enqueueAIRequest(
          { entityId: value.entityId, requester: user.id },
          { traceId: tId },
        );
        metrics.aiRequestTotal.labels('enqueued').inc();
        return { ok: true, requestId: reqId };
      } catch (e) {
        metrics.aiRequestTotal.labels('failed').inc();
        logger.error('requestAIAnalysis error', { err: e, traceId: tId });
        const err = new Error('AI_REQUEST_FAILED');
        err.code = 'AI_REQUEST_FAILED';
        err.details = e.message;
        err.traceId = tId;
        throw err;
      }
    },

    batchGraphUpdate: async (_, args, { user, logger }) => {
      const start = Date.now();
      const tId = traceId();
      ensureRole(user, ['ANALYST', 'ADMIN']);

      const { value, error } = batchInputSchema.validate(args.input, {
        abortEarly: false,
        stripUnknown: true,
      });

      if (error) {
        const err = new Error(`Invalid input: ${error.message}`);
        err.code = 'BAD_USER_INPUT';
        err.traceId = tId;
        throw err;
      }

      const totalOps =
        value.createNodes.length +
        value.createEdges.length +
        value.deleteNodes.length +
        value.deleteEdges.length;

      if (totalOps === 0) {
        const err = new Error('At least one batch operation must be provided');
        err.code = 'BAD_USER_INPUT';
        err.traceId = tId;
        throw err;
      }

      try {
        const result = await GraphOpsService.applyBatchOperations(value, {
          user,
          traceId: tId,
        });
        metrics.resolverLatencyMs.labels('batchGraphUpdate').observe(Date.now() - start);
        return result;
      } catch (e) {
        logger.error('batchGraphUpdate error', { err: e, traceId: tId });
        const err = new Error('BATCH_GRAPH_UPDATE_FAILED');
        err.code = 'BATCH_GRAPH_UPDATE_FAILED';
        err.details = e.message;
        err.traceId = tId;
        throw err;
      }
    },
  },
};

module.exports = { graphResolvers: resolvers };
