import Redis from 'ioredis';
import crypto from 'crypto';
import config from '../config/index.js';

export interface ActiveSessionRecord {
  sessionId: string;
  userId: string;
  refreshTokenId: string;
  refreshTokenHash: string;
  createdAt: string;
  lastActivityAt: string;
  expiresAt: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  revoked?: boolean;
}

const DEFAULT_TTL_SECONDS = 7 * 24 * 60 * 60; // fallback 7 days

class SessionStore {
  private redis: Redis | null = null;
  private fallbackSessions = new Map<string, ActiveSessionRecord>();
  private fallbackByUser = new Map<string, Set<string>>();

  constructor() {
    try {
      this.redis = new Redis({
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password,
        db: config.redis.db,
        lazyConnect: true,
        enableReadyCheck: true,
      });
      this.redis.on('error', (err) => {
        console.warn('[SESSION_STORE] Redis error, falling back to in-memory store:', err.message);
        this.redis = null;
      });
      // Attempt connection but swallow errors to allow fallback
      this.redis.connect().catch((err) => {
        console.warn('[SESSION_STORE] Unable to connect to Redis, using in-memory store:', err.message);
        this.redis = null;
      });
    } catch (error) {
      console.warn('[SESSION_STORE] Redis initialization failed, using in-memory store:', (error as Error).message);
      this.redis = null;
    }
  }

  private sessionKey(sessionId: string): string {
    return `session:id:${sessionId}`;
  }

  private userKey(userId: string): string {
    return `session:user:${userId}`;
  }

  private normalizeRecord(record: ActiveSessionRecord): ActiveSessionRecord {
    return {
      ...record,
      ipAddress: record.ipAddress || null,
      userAgent: record.userAgent || null,
    };
  }

  async saveSession(record: ActiveSessionRecord, ttlSeconds?: number): Promise<void> {
    const normalized = this.normalizeRecord(record);
    const ttl = Math.max(ttlSeconds ?? DEFAULT_TTL_SECONDS, 1);

    if (this.redis) {
      try {
        await this.redis
          .multi()
          .set(this.sessionKey(record.sessionId), JSON.stringify(normalized), 'EX', ttl)
          .sadd(this.userKey(record.userId), record.sessionId)
          .exec();
        return;
      } catch (error) {
        console.warn('[SESSION_STORE] Redis save failed, using in-memory fallback:', (error as Error).message);
      }
    }

    this.fallbackSessions.set(record.sessionId, normalized);
    if (!this.fallbackByUser.has(record.userId)) {
      this.fallbackByUser.set(record.userId, new Set());
    }
    this.fallbackByUser.get(record.userId)?.add(record.sessionId);
  }

  async getSession(sessionId: string): Promise<ActiveSessionRecord | null> {
    if (this.redis) {
      try {
        const raw = await this.redis.get(this.sessionKey(sessionId));
        if (!raw) return null;
        return JSON.parse(raw) as ActiveSessionRecord;
      } catch (error) {
        console.warn('[SESSION_STORE] Redis get failed, using in-memory fallback:', (error as Error).message);
      }
    }
    return this.fallbackSessions.get(sessionId) ?? null;
  }

  async touchSession(sessionId: string): Promise<ActiveSessionRecord | null> {
    const record = await this.getSession(sessionId);
    if (!record) {
      return null;
    }
    const updated: ActiveSessionRecord = {
      ...record,
      lastActivityAt: new Date().toISOString(),
    };
    const ttlSeconds = Math.max(
      Math.ceil((new Date(record.expiresAt).getTime() - Date.now()) / 1000),
      1,
    );
    await this.saveSession(updated, ttlSeconds);
    return updated;
  }

  async revokeSession(sessionId: string): Promise<void> {
    const record = await this.getSession(sessionId);
    if (this.redis) {
      try {
        await this.redis.del(this.sessionKey(sessionId));
        if (record) {
          await this.redis.srem(this.userKey(record.userId), sessionId);
        }
      } catch (error) {
        console.warn('[SESSION_STORE] Redis revoke failed, falling back:', (error as Error).message);
      }
    }

    if (record) {
      this.fallbackByUser.get(record.userId)?.delete(sessionId);
    }
    this.fallbackSessions.delete(sessionId);
  }

  async revokeAllSessionsForUser(userId: string, exceptSessionId?: string): Promise<number> {
    let revoked = 0;
    if (this.redis) {
      try {
        const sessionIds = await this.redis.smembers(this.userKey(userId));
        const targets = sessionIds.filter((id) => id !== exceptSessionId);
        if (targets.length) {
          const pipeline = this.redis.multi();
          targets.forEach((id) => pipeline.del(this.sessionKey(id)));
          pipeline.del(this.userKey(userId));
          await pipeline.exec();
        }
        revoked = targets.length;
      } catch (error) {
        console.warn('[SESSION_STORE] Redis revokeAll failed, falling back:', (error as Error).message);
      }
    }

    if (!this.redis) {
      const sessions = this.fallbackByUser.get(userId);
      if (sessions) {
        for (const id of sessions) {
          if (id === exceptSessionId) continue;
          this.fallbackSessions.delete(id);
          revoked += 1;
        }
        if (exceptSessionId) {
          this.fallbackByUser.set(userId, new Set([exceptSessionId]));
        } else {
          this.fallbackByUser.delete(userId);
        }
      }
    }

    if (exceptSessionId && revoked > 0 && this.redis) {
      await this.redis.sadd(this.userKey(userId), exceptSessionId);
    }

    return revoked;
  }

  async listSessionsForUser(userId: string): Promise<ActiveSessionRecord[]> {
    if (this.redis) {
      try {
        const sessionIds = await this.redis.smembers(this.userKey(userId));
        if (sessionIds.length === 0) return [];
        const pipeline = this.redis.multi();
        sessionIds.forEach((id) => pipeline.get(this.sessionKey(id)));
        const results = await pipeline.exec();
        const sessions: ActiveSessionRecord[] = [];
        results?.forEach((result) => {
          if (Array.isArray(result) && result[1]) {
            try {
              sessions.push(JSON.parse(result[1] as string));
            } catch (err) {
              console.warn('[SESSION_STORE] Failed to parse session payload:', (err as Error).message);
            }
          }
        });
        return sessions.filter((session) => !session.revoked);
      } catch (error) {
        console.warn('[SESSION_STORE] Redis list failed, falling back:', (error as Error).message);
      }
    }

    const sessions = Array.from(this.fallbackSessions.values()).filter(
      (session) => session.userId === userId && !session.revoked,
    );
    return sessions;
  }

  hashRefreshToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}

export const sessionStore = new SessionStore();
export type SessionStoreType = SessionStore;
