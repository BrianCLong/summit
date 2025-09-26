const { getRedisClient } = require('../config/database');
const logger = require('../utils/logger');

const CONFIG_ROOT = 'feed:ingestion:config';
const SCOPE_PREFIX = {
  TENANT: 'tenant',
  USER: 'user',
};

function requireUser(ctx) {
  if (!ctx || !ctx.user) {
    const error = new Error('Authentication required');
    error.code = 'UNAUTHENTICATED';
    throw error;
  }
  return ctx.user;
}

function ensureAdmin(user) {
  const role = (user.role || '').toUpperCase();
  if (role !== 'ADMIN' && role !== 'OWNER') {
    const error = new Error('Forbidden');
    error.code = 'FORBIDDEN';
    throw error;
  }
}

function getRedisOrThrow() {
  const redis = getRedisClient();
  if (!redis) {
    const error = new Error('Redis unavailable for ingestion rate limiting');
    error.code = 'SERVICE_UNAVAILABLE';
    throw error;
  }
  return redis;
}

function normalizeScope(scope) {
  const normalized = String(scope || '').toUpperCase();
  if (!SCOPE_PREFIX[normalized]) {
    throw new Error(`Unsupported rate limit scope: ${scope}`);
  }
  return normalized;
}

function buildConfigKey(scope, scopeId) {
  return `${CONFIG_ROOT}:${SCOPE_PREFIX[scope]}:${scopeId}`;
}

function serializeConfig(input, user) {
  const payload = {
    maxPerMinute: Math.floor(Number(input.maxPerMinute)),
    burst: Math.floor(Number(input.burst)),
    updatedAt: new Date().toISOString(),
    updatedBy: user.id || user.email || 'system',
  };

  if (!Number.isFinite(payload.maxPerMinute) || payload.maxPerMinute <= 0) {
    throw new Error('maxPerMinute must be a positive integer');
  }

  if (!Number.isFinite(payload.burst) || payload.burst <= 0) {
    throw new Error('burst must be a positive integer');
  }

  if (payload.burst < payload.maxPerMinute) {
    logger.warn('Burst capacity is lower than per-minute limit; adjusting to match maxPerMinute', {
      scope: input.scope,
      scopeId: input.scopeId,
      maxPerMinute: payload.maxPerMinute,
      burst: payload.burst,
    });
    payload.burst = payload.maxPerMinute;
  }

  return payload;
}

async function readConfig(redis, scope, scopeId) {
  const key = buildConfigKey(scope, scopeId);
  const raw = await redis.get(key);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
    return {
      scope,
      scopeId,
      maxPerMinute: Number(parsed.maxPerMinute),
      burst: Number(parsed.burst),
      updatedAt: parsed.updatedAt,
      updatedBy: parsed.updatedBy,
    };
  } catch (error) {
    logger.warn('Failed to parse ingestion rate limit config', { key, error });
    return null;
  }
}

async function listConfigs(redis, scope) {
  const prefix = `${CONFIG_ROOT}:${SCOPE_PREFIX[scope]}:`;
  const keys = await redis.keys(`${prefix}*`);
  if (!keys.length) {
    return [];
  }

  const configs = await Promise.all(
    keys.map(async (key) => {
      const scopeId = key.substring(prefix.length);
      return readConfig(redis, scope, scopeId);
    }),
  );

  return configs.filter(Boolean);
}

module.exports = {
  Query: {
    ingestionRateLimit: async (_, args, ctx) => {
      const user = requireUser(ctx);
      const scope = normalizeScope(args.scope);
      const redis = getRedisOrThrow();
      const config = await readConfig(redis, scope, args.scopeId);
      logger.info('Fetched ingestion rate limit configuration', {
        userId: user.id,
        scope,
        scopeId: args.scopeId,
        found: Boolean(config),
      });
      return config;
    },
    ingestionRateLimits: async (_, args, ctx) => {
      const user = requireUser(ctx);
      const scope = normalizeScope(args.scope);
      ensureAdmin(user);
      const redis = getRedisOrThrow();
      const configs = await listConfigs(redis, scope);
      logger.info('Listed ingestion rate limit configurations', {
        userId: user.id,
        scope,
        count: configs.length,
      });
      return configs;
    },
  },
  Mutation: {
    upsertIngestionRateLimit: async (_, { input }, ctx) => {
      const user = requireUser(ctx);
      ensureAdmin(user);
      const scope = normalizeScope(input.scope);
      const redis = getRedisOrThrow();
      const payload = serializeConfig(input, user);
      const key = buildConfigKey(scope, input.scopeId);
      await redis.set(key, JSON.stringify(payload));
      logger.info('Upserted ingestion rate limit configuration', {
        userId: user.id,
        scope,
        scopeId: input.scopeId,
        maxPerMinute: payload.maxPerMinute,
        burst: payload.burst,
      });
      return {
        scope,
        scopeId: input.scopeId,
        maxPerMinute: payload.maxPerMinute,
        burst: payload.burst,
        updatedAt: payload.updatedAt,
        updatedBy: payload.updatedBy,
      };
    },
    deleteIngestionRateLimit: async (_, { scope, scopeId }, ctx) => {
      const user = requireUser(ctx);
      ensureAdmin(user);
      const normalizedScope = normalizeScope(scope);
      const redis = getRedisOrThrow();
      const key = buildConfigKey(normalizedScope, scopeId);
      const removed = (await redis.del(key)) > 0;
      logger.info('Deleted ingestion rate limit configuration', {
        userId: user.id,
        scope: normalizedScope,
        scopeId,
        removed,
      });
      return removed;
    },
  },
};
