"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAnnotations = getAnnotations;
exports.addAnnotation = addAnnotation;
exports.updateAnnotation = updateAnnotation;
exports.deleteAnnotation = deleteAnnotation;
exports.getComments = getComments;
exports.addComment = addComment;
exports.updateComment = updateComment;
exports.deleteComment = deleteComment;
exports.recordActivity = recordActivity;
exports.getActivity = getActivity;
exports.setPresence = setPresence;
exports.touchPresence = touchPresence;
exports.removePresence = removePresence;
exports.getPresence = getPresence;
exports.getInMemoryState = getInMemoryState;
const ioredis_1 = __importDefault(require("ioredis"));
const pino_1 = __importDefault(require("pino"));
const node_crypto_1 = require("node:crypto");
const logger = pino_1.default({ name: 'investigation-state' });
const redisUrl = process.env.REDIS_URL;
const redisHost = process.env.REDIS_HOST;
const redisPort = process.env.REDIS_PORT;
const redisPassword = process.env.REDIS_PASSWORD;
let redis = null;
try {
    if (redisUrl) {
        redis = new ioredis_1.default(redisUrl);
    }
    else if (redisHost) {
        redis = new ioredis_1.default({
            host: redisHost,
            port: Number(redisPort || 6379),
            password: redisPassword,
        });
    }
    redis?.on('error', (err) => {
        logger.warn({ err }, 'Redis unavailable for investigation state, using memory');
        redis = null;
    });
}
catch (err) {
    logger.warn({ err }, 'Failed to init Redis for investigation state');
    redis = null;
}
const annotationsStore = new Map();
const commentsStore = new Map();
const activityStore = new Map();
const presenceStore = new Map();
const PRESENCE_TTL_MS = 60_000;
const ACTIVITY_LIMIT = 200;
function annotationKey(investigationId) {
    return `intelgraph:investigation:${investigationId}:annotations`;
}
function commentKey(investigationId) {
    return `intelgraph:investigation:${investigationId}:comments`;
}
function activityKey(investigationId) {
    return `intelgraph:investigation:${investigationId}:activity`;
}
function presenceKey(investigationId) {
    return `intelgraph:investigation:${investigationId}:presence`;
}
function ensureMap(store, key) {
    let map = store.get(key);
    if (!map) {
        map = new Map();
        store.set(key, map);
    }
    return map;
}
function upsertMemory(store, investigationId, entity) {
    const map = ensureMap(store, investigationId);
    map.set(entity.id, entity);
}
function deleteFromMemory(store, investigationId, id) {
    const map = store.get(investigationId);
    if (map) {
        map.delete(id);
        if (map.size === 0) {
            store.delete(investigationId);
        }
    }
}
function getMemoryValues(store, investigationId) {
    const map = store.get(investigationId);
    return map ? Array.from(map.values()) : [];
}
async function getAnnotations(investigationId) {
    if (redis) {
        try {
            const raw = await redis.hgetall(annotationKey(investigationId));
            const values = Object.values(raw).map((value) => JSON.parse(value));
            values.sort((a, b) => a.createdAt - b.createdAt);
            values.forEach((val) => upsertMemory(annotationsStore, investigationId, val));
            return values;
        }
        catch (err) {
            logger.warn({ err }, 'Failed to fetch annotations from Redis');
        }
    }
    return getMemoryValues(annotationsStore, investigationId);
}
async function addAnnotation(investigationId, input) {
    const annotation = {
        id: (0, node_crypto_1.randomUUID)(),
        ...input,
        createdAt: Date.now(),
        updatedAt: Date.now(),
    };
    upsertMemory(annotationsStore, investigationId, annotation);
    if (redis) {
        try {
            await redis.hset(annotationKey(investigationId), annotation.id, JSON.stringify(annotation));
        }
        catch (err) {
            logger.warn({ err }, 'Failed to persist annotation to Redis');
        }
    }
    return annotation;
}
async function updateAnnotation(investigationId, annotationId, patch) {
    const existing = ensureMap(annotationsStore, investigationId).get(annotationId);
    let current = existing || null;
    if (!current && redis) {
        try {
            const raw = await redis.hget(annotationKey(investigationId), annotationId);
            current = raw ? JSON.parse(raw) : null;
        }
        catch (err) {
            logger.warn({ err }, 'Failed to load annotation from Redis');
        }
    }
    if (!current)
        return null;
    const next = {
        ...current,
        ...patch,
        updatedAt: Date.now(),
    };
    upsertMemory(annotationsStore, investigationId, next);
    if (redis) {
        try {
            await redis.hset(annotationKey(investigationId), annotationId, JSON.stringify(next));
        }
        catch (err) {
            logger.warn({ err }, 'Failed to update annotation in Redis');
        }
    }
    return next;
}
async function deleteAnnotation(investigationId, annotationId) {
    deleteFromMemory(annotationsStore, investigationId, annotationId);
    if (redis) {
        try {
            await redis.hdel(annotationKey(investigationId), annotationId);
        }
        catch (err) {
            logger.warn({ err }, 'Failed to delete annotation from Redis');
        }
    }
    return true;
}
async function getComments(investigationId) {
    if (redis) {
        try {
            const raw = await redis.hgetall(commentKey(investigationId));
            const values = Object.values(raw).map((value) => JSON.parse(value));
            values.sort((a, b) => a.createdAt - b.createdAt);
            values.forEach((val) => upsertMemory(commentsStore, investigationId, val));
            return values;
        }
        catch (err) {
            logger.warn({ err }, 'Failed to fetch comments from Redis');
        }
    }
    return getMemoryValues(commentsStore, investigationId);
}
async function addComment(investigationId, input) {
    const comment = {
        id: (0, node_crypto_1.randomUUID)(),
        ...input,
        createdAt: Date.now(),
        updatedAt: Date.now(),
    };
    upsertMemory(commentsStore, investigationId, comment);
    if (redis) {
        try {
            await redis.hset(commentKey(investigationId), comment.id, JSON.stringify(comment));
        }
        catch (err) {
            logger.warn({ err }, 'Failed to persist comment to Redis');
        }
    }
    return comment;
}
async function updateComment(investigationId, commentId, patch) {
    const existing = ensureMap(commentsStore, investigationId).get(commentId);
    let current = existing || null;
    if (!current && redis) {
        try {
            const raw = await redis.hget(commentKey(investigationId), commentId);
            current = raw ? JSON.parse(raw) : null;
        }
        catch (err) {
            logger.warn({ err }, 'Failed to load comment from Redis');
        }
    }
    if (!current)
        return null;
    const next = {
        ...current,
        ...patch,
        updatedAt: Date.now(),
    };
    upsertMemory(commentsStore, investigationId, next);
    if (redis) {
        try {
            await redis.hset(commentKey(investigationId), commentId, JSON.stringify(next));
        }
        catch (err) {
            logger.warn({ err }, 'Failed to update comment in Redis');
        }
    }
    return next;
}
async function deleteComment(investigationId, commentId) {
    deleteFromMemory(commentsStore, investigationId, commentId);
    if (redis) {
        try {
            await redis.hdel(commentKey(investigationId), commentId);
        }
        catch (err) {
            logger.warn({ err }, 'Failed to delete comment from Redis');
        }
    }
    return true;
}
async function recordActivity(investigationId, entry) {
    const activity = {
        id: (0, node_crypto_1.randomUUID)(),
        ...entry,
        timestamp: entry.timestamp ?? Date.now(),
    };
    const existing = activityStore.get(investigationId) || [];
    activityStore.set(investigationId, [activity, ...existing].slice(0, ACTIVITY_LIMIT));
    if (redis) {
        try {
            await redis.lpush(activityKey(investigationId), JSON.stringify(activity));
            await redis.ltrim(activityKey(investigationId), 0, ACTIVITY_LIMIT - 1);
        }
        catch (err) {
            logger.warn({ err }, 'Failed to append activity to Redis');
        }
    }
    return activity;
}
async function getActivity(investigationId, limit = 50) {
    if (redis) {
        try {
            const raw = await redis.lrange(activityKey(investigationId), 0, limit - 1);
            const list = raw.map((value) => JSON.parse(value));
            if (list.length > 0) {
                activityStore.set(investigationId, list);
            }
            return list;
        }
        catch (err) {
            logger.warn({ err }, 'Failed to fetch activity from Redis');
        }
    }
    return (activityStore.get(investigationId) || []).slice(0, limit);
}
async function setPresence(investigationId, user) {
    const map = ensureMap(presenceStore, investigationId);
    const entry = { ...user, lastSeen: Date.now() };
    map.set(user.userId, entry);
    if (redis) {
        try {
            await redis.hset(presenceKey(investigationId), user.userId, JSON.stringify(entry));
            await redis.expire(presenceKey(investigationId), 120);
        }
        catch (err) {
            logger.warn({ err }, 'Failed to update presence in Redis');
        }
    }
    return getPresence(investigationId);
}
async function touchPresence(investigationId, userId, status = 'online') {
    const map = ensureMap(presenceStore, investigationId);
    const existing = map.get(userId);
    if (!existing) {
        return setPresence(investigationId, {
            userId,
            username: userId,
            status,
            lastSeen: Date.now(),
        });
    }
    const next = { ...existing, status, lastSeen: Date.now() };
    map.set(userId, next);
    if (redis) {
        try {
            await redis.hset(presenceKey(investigationId), userId, JSON.stringify(next));
            await redis.expire(presenceKey(investigationId), 120);
        }
        catch (err) {
            logger.warn({ err }, 'Failed to refresh presence in Redis');
        }
    }
    return getPresence(investigationId);
}
async function removePresence(investigationId, userId) {
    const map = presenceStore.get(investigationId);
    if (map) {
        map.delete(userId);
        if (map.size === 0) {
            presenceStore.delete(investigationId);
        }
    }
    if (redis) {
        try {
            await redis.hdel(presenceKey(investigationId), userId);
        }
        catch (err) {
            logger.warn({ err }, 'Failed to remove presence from Redis');
        }
    }
    return getPresence(investigationId);
}
async function getPresence(investigationId) {
    const now = Date.now();
    const map = ensureMap(presenceStore, investigationId);
    if (redis) {
        try {
            const raw = await redis.hgetall(presenceKey(investigationId));
            Object.entries(raw).forEach(([userId, value]) => {
                try {
                    const parsed = JSON.parse(value);
                    map.set(userId, parsed);
                }
                catch (err) {
                    logger.warn({ err, investigationId }, 'Failed to parse presence');
                }
            });
        }
        catch (err) {
            logger.warn({ err }, 'Failed to load presence from Redis');
        }
    }
    const entries = Array.from(map.values()).filter((entry) => now - entry.lastSeen <= PRESENCE_TTL_MS);
    for (const entry of map.values()) {
        if (now - entry.lastSeen > PRESENCE_TTL_MS) {
            map.delete(entry.userId);
            if (redis) {
                redis
                    ?.hdel(presenceKey(investigationId), entry.userId)
                    .catch((err) => logger.warn({ err }, 'Failed to prune stale presence in Redis'));
            }
        }
    }
    return entries;
}
function getInMemoryState(investigationId) {
    return {
        annotations: getMemoryValues(annotationsStore, investigationId),
        comments: getMemoryValues(commentsStore, investigationId),
        activity: (activityStore.get(investigationId) || []).slice(0, 50),
        presence: getMemoryValues(presenceStore, investigationId),
    };
}
