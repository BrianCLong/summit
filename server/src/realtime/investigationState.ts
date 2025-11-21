import Redis from 'ioredis';
import pino from 'pino';
import { randomUUID } from 'node:crypto';

export interface PresenceUser {
  userId: string;
  username: string;
  status: 'online' | 'away' | 'offline';
  lastSeen: number;
}

export interface GraphAnnotation {
  id: string;
  targetId: string;
  text: string;
  authorId: string;
  authorName: string;
  createdAt: number;
  updatedAt: number;
  position?: { x: number; y: number } | null;
  resolved?: boolean;
}

export interface GraphComment {
  id: string;
  threadId: string;
  targetId: string;
  message: string;
  authorId: string;
  authorName: string;
  createdAt: number;
  updatedAt: number;
}

export interface ActivityEntry {
  id: string;
  type: string;
  action: string;
  actorId: string;
  actorName: string;
  timestamp: number;
  details?: Record<string, any>;
}

const logger = pino({ name: 'investigation-state' });

const redisUrl = process.env.REDIS_URL;
const redisHost = process.env.REDIS_HOST;
const redisPort = process.env.REDIS_PORT;
const redisPassword = process.env.REDIS_PASSWORD;

let redis: Redis | null = null;

try {
  if (redisUrl) {
    redis = new Redis(redisUrl);
  } else if (redisHost) {
    redis = new Redis({
      host: redisHost,
      port: Number(redisPort || 6379),
      password: redisPassword,
    });
  }
  redis?.on('error', (err) => {
    logger.warn({ err }, 'Redis unavailable for investigation state, using memory');
    redis = null;
  });
} catch (err) {
  logger.warn({ err }, 'Failed to init Redis for investigation state');
  redis = null;
}

const annotationsStore = new Map<string, Map<string, GraphAnnotation>>();
const commentsStore = new Map<string, Map<string, GraphComment>>();
const activityStore = new Map<string, ActivityEntry[]>();
const presenceStore = new Map<string, Map<string, PresenceUser>>();

const PRESENCE_TTL_MS = 60_000;
const ACTIVITY_LIMIT = 200;

function annotationKey(investigationId: string) {
  return `intelgraph:investigation:${investigationId}:annotations`;
}

function commentKey(investigationId: string) {
  return `intelgraph:investigation:${investigationId}:comments`;
}

function activityKey(investigationId: string) {
  return `intelgraph:investigation:${investigationId}:activity`;
}

function presenceKey(investigationId: string) {
  return `intelgraph:investigation:${investigationId}:presence`;
}

function ensureMap<T>(store: Map<string, Map<string, T>>, key: string) {
  let map = store.get(key);
  if (!map) {
    map = new Map();
    store.set(key, map);
  }
  return map;
}

function upsertMemory<T extends { id: string }>(
  store: Map<string, Map<string, T>>,
  investigationId: string,
  entity: T,
) {
  const map = ensureMap(store, investigationId);
  map.set(entity.id, entity);
}

function deleteFromMemory<T>(
  store: Map<string, Map<string, T>>,
  investigationId: string,
  id: string,
) {
  const map = store.get(investigationId);
  if (map) {
    map.delete(id);
    if (map.size === 0) {
      store.delete(investigationId);
    }
  }
}

function getMemoryValues<T>(
  store: Map<string, Map<string, T>>,
  investigationId: string,
): T[] {
  const map = store.get(investigationId);
  return map ? Array.from(map.values()) : [];
}

export async function getAnnotations(
  investigationId: string,
): Promise<GraphAnnotation[]> {
  if (redis) {
    try {
      const raw = await redis.hgetall(annotationKey(investigationId));
      const values = Object.values(raw).map((value) =>
        JSON.parse(value as unknown as string),
      );
      values.sort((a, b) => a.createdAt - b.createdAt);
      values.forEach((val) => upsertMemory(annotationsStore, investigationId, val));
      return values;
    } catch (err) {
      logger.warn({ err }, 'Failed to fetch annotations from Redis');
    }
  }
  return getMemoryValues(annotationsStore, investigationId);
}

export async function addAnnotation(
  investigationId: string,
  input: Omit<GraphAnnotation, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<GraphAnnotation> {
  const annotation: GraphAnnotation = {
    id: randomUUID(),
    ...input,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  upsertMemory(annotationsStore, investigationId, annotation);
  if (redis) {
    try {
      await redis.hset(
        annotationKey(investigationId),
        annotation.id,
        JSON.stringify(annotation),
      );
    } catch (err) {
      logger.warn({ err }, 'Failed to persist annotation to Redis');
    }
  }
  return annotation;
}

export async function updateAnnotation(
  investigationId: string,
  annotationId: string,
  patch: Partial<Omit<GraphAnnotation, 'id' | 'createdAt'>>,
): Promise<GraphAnnotation | null> {
  const existing = ensureMap(annotationsStore, investigationId).get(annotationId);
  let current = existing || null;
  if (!current && redis) {
    try {
      const raw = await redis.hget(annotationKey(investigationId), annotationId);
      current = raw ? JSON.parse(raw) : null;
    } catch (err) {
      logger.warn({ err }, 'Failed to load annotation from Redis');
    }
  }
  if (!current) return null;
  const next: GraphAnnotation = {
    ...current,
    ...patch,
    updatedAt: Date.now(),
  };
  upsertMemory(annotationsStore, investigationId, next);
  if (redis) {
    try {
      await redis.hset(
        annotationKey(investigationId),
        annotationId,
        JSON.stringify(next),
      );
    } catch (err) {
      logger.warn({ err }, 'Failed to update annotation in Redis');
    }
  }
  return next;
}

export async function deleteAnnotation(
  investigationId: string,
  annotationId: string,
): Promise<boolean> {
  deleteFromMemory(annotationsStore, investigationId, annotationId);
  if (redis) {
    try {
      await redis.hdel(annotationKey(investigationId), annotationId);
    } catch (err) {
      logger.warn({ err }, 'Failed to delete annotation from Redis');
    }
  }
  return true;
}

export async function getComments(
  investigationId: string,
): Promise<GraphComment[]> {
  if (redis) {
    try {
      const raw = await redis.hgetall(commentKey(investigationId));
      const values = Object.values(raw).map((value) =>
        JSON.parse(value as unknown as string),
      );
      values.sort((a, b) => a.createdAt - b.createdAt);
      values.forEach((val) => upsertMemory(commentsStore, investigationId, val));
      return values;
    } catch (err) {
      logger.warn({ err }, 'Failed to fetch comments from Redis');
    }
  }
  return getMemoryValues(commentsStore, investigationId);
}

export async function addComment(
  investigationId: string,
  input: Omit<GraphComment, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<GraphComment> {
  const comment: GraphComment = {
    id: randomUUID(),
    ...input,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  upsertMemory(commentsStore, investigationId, comment);
  if (redis) {
    try {
      await redis.hset(
        commentKey(investigationId),
        comment.id,
        JSON.stringify(comment),
      );
    } catch (err) {
      logger.warn({ err }, 'Failed to persist comment to Redis');
    }
  }
  return comment;
}

export async function updateComment(
  investigationId: string,
  commentId: string,
  patch: Partial<Omit<GraphComment, 'id' | 'createdAt'>>,
): Promise<GraphComment | null> {
  const existing = ensureMap(commentsStore, investigationId).get(commentId);
  let current = existing || null;
  if (!current && redis) {
    try {
      const raw = await redis.hget(commentKey(investigationId), commentId);
      current = raw ? JSON.parse(raw) : null;
    } catch (err) {
      logger.warn({ err }, 'Failed to load comment from Redis');
    }
  }
  if (!current) return null;
  const next: GraphComment = {
    ...current,
    ...patch,
    updatedAt: Date.now(),
  };
  upsertMemory(commentsStore, investigationId, next);
  if (redis) {
    try {
      await redis.hset(
        commentKey(investigationId),
        commentId,
        JSON.stringify(next),
      );
    } catch (err) {
      logger.warn({ err }, 'Failed to update comment in Redis');
    }
  }
  return next;
}

export async function deleteComment(
  investigationId: string,
  commentId: string,
): Promise<boolean> {
  deleteFromMemory(commentsStore, investigationId, commentId);
  if (redis) {
    try {
      await redis.hdel(commentKey(investigationId), commentId);
    } catch (err) {
      logger.warn({ err }, 'Failed to delete comment from Redis');
    }
  }
  return true;
}

export async function recordActivity(
  investigationId: string,
  entry: Omit<ActivityEntry, 'id' | 'timestamp'> & { timestamp?: number },
): Promise<ActivityEntry> {
  const activity: ActivityEntry = {
    id: randomUUID(),
    ...entry,
    timestamp: entry.timestamp ?? Date.now(),
  };
  const existing = activityStore.get(investigationId) || [];
  activityStore.set(
    investigationId,
    [activity, ...existing].slice(0, ACTIVITY_LIMIT),
  );
  if (redis) {
    try {
      await redis.lpush(activityKey(investigationId), JSON.stringify(activity));
      await redis.ltrim(activityKey(investigationId), 0, ACTIVITY_LIMIT - 1);
    } catch (err) {
      logger.warn({ err }, 'Failed to append activity to Redis');
    }
  }
  return activity;
}

export async function getActivity(
  investigationId: string,
  limit = 50,
): Promise<ActivityEntry[]> {
  if (redis) {
    try {
      const raw = await redis.lrange(activityKey(investigationId), 0, limit - 1);
      const list = raw.map((value) => JSON.parse(value) as ActivityEntry);
      if (list.length > 0) {
        activityStore.set(investigationId, list);
      }
      return list;
    } catch (err) {
      logger.warn({ err }, 'Failed to fetch activity from Redis');
    }
  }
  return (activityStore.get(investigationId) || []).slice(0, limit);
}

export async function setPresence(
  investigationId: string,
  user: PresenceUser,
): Promise<PresenceUser[]> {
  const map = ensureMap(presenceStore, investigationId);
  const entry = { ...user, lastSeen: Date.now() };
  map.set(user.userId, entry);
  if (redis) {
    try {
      await redis.hset(
        presenceKey(investigationId),
        user.userId,
        JSON.stringify(entry),
      );
      await redis.expire(presenceKey(investigationId), 120);
    } catch (err) {
      logger.warn({ err }, 'Failed to update presence in Redis');
    }
  }
  return getPresence(investigationId);
}

export async function touchPresence(
  investigationId: string,
  userId: string,
  status: PresenceUser['status'] = 'online',
): Promise<PresenceUser[]> {
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
      await redis.hset(
        presenceKey(investigationId),
        userId,
        JSON.stringify(next),
      );
      await redis.expire(presenceKey(investigationId), 120);
    } catch (err) {
      logger.warn({ err }, 'Failed to refresh presence in Redis');
    }
  }
  return getPresence(investigationId);
}

export async function removePresence(
  investigationId: string,
  userId: string,
): Promise<PresenceUser[]> {
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
    } catch (err) {
      logger.warn({ err }, 'Failed to remove presence from Redis');
    }
  }
  return getPresence(investigationId);
}

export async function getPresence(
  investigationId: string,
): Promise<PresenceUser[]> {
  const now = Date.now();
  const map = ensureMap(presenceStore, investigationId);
  if (redis) {
    try {
      const raw = await redis.hgetall(presenceKey(investigationId));
      Object.entries(raw).forEach(([userId, value]) => {
        try {
          const parsed = JSON.parse(value as unknown as string) as PresenceUser;
          map.set(userId, parsed);
        } catch (err) {
          logger.warn({ err, investigationId }, 'Failed to parse presence');
        }
      });
    } catch (err) {
      logger.warn({ err }, 'Failed to load presence from Redis');
    }
  }
  const entries = Array.from(map.values()).filter(
    (entry) => now - entry.lastSeen <= PRESENCE_TTL_MS,
  );
  for (const entry of map.values()) {
    if (now - entry.lastSeen > PRESENCE_TTL_MS) {
      map.delete(entry.userId);
      if (redis) {
        redis
          ?.hdel(presenceKey(investigationId), entry.userId)
          .catch((err) =>
            logger.warn({ err }, 'Failed to prune stale presence in Redis'),
          );
      }
    }
  }
  return entries;
}

export function getInMemoryState(investigationId: string) {
  return {
    annotations: getMemoryValues(annotationsStore, investigationId),
    comments: getMemoryValues(commentsStore, investigationId),
    activity: (activityStore.get(investigationId) || []).slice(0, 50),
    presence: getMemoryValues(presenceStore as any, investigationId) as PresenceUser[],
  };
}
