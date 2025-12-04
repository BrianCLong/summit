/**
 * ChatOps Session Manager
 *
 * Manages conversation session lifecycle across all adapters:
 * - Session creation and initialization
 * - Multi-channel session correlation
 * - State persistence and recovery
 * - Session expiration and cleanup
 * - Cross-adapter session handoff
 * - Concurrent session handling
 *
 * Features:
 * - Redis-backed session state
 * - PostgreSQL session history
 * - Real-time session synchronization
 * - Graceful session migration
 * - Security context propagation
 */

import { Pool } from 'pg';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';

import type {
  ConversationTurn,
  SecurityContext,
  OSINTEntity,
} from '../types.js';

// =============================================================================
// TYPES
// =============================================================================

export interface SessionConfig {
  postgres: Pool;
  redis: Redis;
  defaultTtlSeconds?: number;
  maxIdleSeconds?: number;
  maxTurnsPerSession?: number;
  maxConcurrentSessions?: number;
  enableCrossChannel?: boolean;
  cleanupIntervalMs?: number;
}

export interface Session {
  id: string;
  userId: string;
  tenantId: string;
  platform: 'slack' | 'teams' | 'web' | 'api';
  channelId: string;
  threadId?: string;
  status: 'active' | 'idle' | 'suspended' | 'expired' | 'terminated';
  securityContext: SecurityContext;
  metadata: SessionMetadata;
  turns: ConversationTurn[];
  summary?: string;
  extractedEntities: OSINTEntity[];
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
  lastActivityAt: Date;
}

export interface SessionMetadata {
  userAgent?: string;
  ipAddress?: string;
  locale?: string;
  timezone?: string;
  linkedSessions?: string[];
  parentSessionId?: string;
  investigation?: {
    id: string;
    name: string;
    phase: string;
  };
  custom: Record<string, unknown>;
}

export interface SessionStats {
  totalSessions: number;
  activeSessions: number;
  idleSessions: number;
  avgTurnsPerSession: number;
  avgSessionDurationMs: number;
  sessionsByPlatform: Record<string, number>;
  sessionsByTenant: Record<string, number>;
}

export type SessionEvent =
  | { type: 'created'; session: Session }
  | { type: 'updated'; session: Session; changes: Partial<Session> }
  | { type: 'turn_added'; sessionId: string; turn: ConversationTurn }
  | { type: 'status_changed'; sessionId: string; oldStatus: string; newStatus: string }
  | { type: 'expired'; sessionId: string }
  | { type: 'terminated'; sessionId: string; reason: string }
  | { type: 'handoff'; fromSessionId: string; toSessionId: string };

// =============================================================================
// SESSION MANAGER
// =============================================================================

export class SessionManager extends EventEmitter {
  private config: SessionConfig;
  private postgres: Pool;
  private redis: Redis;
  private redisSub: Redis;
  private cleanupInterval?: NodeJS.Timeout;
  private localCache: Map<string, Session> = new Map();

  constructor(config: SessionConfig) {
    super();

    this.config = {
      defaultTtlSeconds: 3600, // 1 hour
      maxIdleSeconds: 900, // 15 minutes
      maxTurnsPerSession: 200,
      maxConcurrentSessions: 5,
      enableCrossChannel: true,
      cleanupIntervalMs: 60000, // 1 minute
      ...config,
    };

    this.postgres = config.postgres;
    this.redis = config.redis;
    this.redisSub = config.redis.duplicate();
  }

  // ===========================================================================
  // LIFECYCLE
  // ===========================================================================

  async initialize(): Promise<void> {
    // Subscribe to session events
    await this.redisSub.subscribe('chatops:session:events');
    this.redisSub.on('message', this.handleRedisEvent.bind(this));

    // Start cleanup interval
    this.cleanupInterval = setInterval(
      () => this.cleanupExpiredSessions(),
      this.config.cleanupIntervalMs!
    );

    console.log('[SessionManager] Initialized');
  }

  async shutdown(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    await this.redisSub.unsubscribe();
    await this.redisSub.quit();

    // Persist all active sessions
    for (const session of this.localCache.values()) {
      await this.persistSession(session);
    }

    console.log('[SessionManager] Shutdown complete');
  }

  // ===========================================================================
  // SESSION CRUD
  // ===========================================================================

  async createSession(params: {
    userId: string;
    tenantId: string;
    platform: Session['platform'];
    channelId: string;
    threadId?: string;
    securityContext: SecurityContext;
    metadata?: Partial<SessionMetadata>;
  }): Promise<Session> {
    // Check concurrent session limit
    const existingSessions = await this.getActiveSessionsForUser(params.userId);
    if (existingSessions.length >= this.config.maxConcurrentSessions!) {
      // Expire oldest session
      const oldest = existingSessions.sort(
        (a, b) => a.lastActivityAt.getTime() - b.lastActivityAt.getTime()
      )[0];
      await this.expireSession(oldest.id, 'max_concurrent_sessions');
    }

    const now = new Date();
    const session: Session = {
      id: uuidv4(),
      userId: params.userId,
      tenantId: params.tenantId,
      platform: params.platform,
      channelId: params.channelId,
      threadId: params.threadId,
      status: 'active',
      securityContext: params.securityContext,
      metadata: {
        custom: {},
        ...params.metadata,
      },
      turns: [],
      extractedEntities: [],
      createdAt: now,
      updatedAt: now,
      expiresAt: new Date(now.getTime() + this.config.defaultTtlSeconds! * 1000),
      lastActivityAt: now,
    };

    // Persist to Redis and PostgreSQL
    await this.cacheSession(session);
    await this.insertSessionToPostgres(session);

    // Emit event
    this.emitSessionEvent({ type: 'created', session });

    return session;
  }

  async getSession(sessionId: string): Promise<Session | null> {
    // Check local cache first
    if (this.localCache.has(sessionId)) {
      return this.localCache.get(sessionId)!;
    }

    // Check Redis
    const cached = await this.redis.get(`session:${sessionId}`);
    if (cached) {
      const session = this.deserializeSession(JSON.parse(cached));
      this.localCache.set(sessionId, session);
      return session;
    }

    // Check PostgreSQL
    const result = await this.postgres.query(
      `SELECT * FROM chatops_sessions WHERE id = $1`,
      [sessionId]
    );

    if (result.rows[0]) {
      const session = this.rowToSession(result.rows[0]);
      await this.cacheSession(session);
      return session;
    }

    return null;
  }

  async getOrCreateSession(params: {
    userId: string;
    tenantId: string;
    platform: Session['platform'];
    channelId: string;
    threadId?: string;
    securityContext: SecurityContext;
  }): Promise<Session> {
    // Look for existing active session in same channel/thread
    const existing = await this.findActiveSession(
      params.userId,
      params.platform,
      params.channelId,
      params.threadId
    );

    if (existing) {
      // Refresh the session
      await this.touchSession(existing.id);
      return existing;
    }

    // Create new session
    return this.createSession(params);
  }

  async updateSession(sessionId: string, updates: Partial<Session>): Promise<Session | null> {
    const session = await this.getSession(sessionId);
    if (!session) return null;

    const updatedSession: Session = {
      ...session,
      ...updates,
      updatedAt: new Date(),
    };

    await this.cacheSession(updatedSession);
    await this.updateSessionInPostgres(updatedSession);

    this.emitSessionEvent({
      type: 'updated',
      session: updatedSession,
      changes: updates,
    });

    return updatedSession;
  }

  async deleteSession(sessionId: string): Promise<void> {
    this.localCache.delete(sessionId);
    await this.redis.del(`session:${sessionId}`);

    // Soft delete in PostgreSQL
    await this.postgres.query(
      `UPDATE chatops_sessions SET status = 'terminated', updated_at = NOW() WHERE id = $1`,
      [sessionId]
    );

    this.emitSessionEvent({
      type: 'terminated',
      sessionId,
      reason: 'deleted',
    });
  }

  // ===========================================================================
  // SESSION OPERATIONS
  // ===========================================================================

  async addTurn(sessionId: string, turn: ConversationTurn): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    // Check turn limit
    if (session.turns.length >= this.config.maxTurnsPerSession!) {
      // Trigger compression or summary
      console.log(`[SessionManager] Session ${sessionId} reached max turns, triggering compression`);
    }

    session.turns.push(turn);
    session.lastActivityAt = new Date();
    session.updatedAt = new Date();

    // Extract entities from turn
    if (turn.entities?.length) {
      session.extractedEntities.push(...turn.entities);
    }

    await this.cacheSession(session);

    // Persist turn to PostgreSQL
    await this.insertTurnToPostgres(sessionId, turn);

    this.emitSessionEvent({
      type: 'turn_added',
      sessionId,
      turn,
    });
  }

  async touchSession(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) return;

    session.lastActivityAt = new Date();
    session.expiresAt = new Date(Date.now() + this.config.defaultTtlSeconds! * 1000);

    if (session.status === 'idle') {
      session.status = 'active';
      this.emitSessionEvent({
        type: 'status_changed',
        sessionId,
        oldStatus: 'idle',
        newStatus: 'active',
      });
    }

    await this.cacheSession(session);
  }

  async suspendSession(sessionId: string, reason?: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) return;

    const oldStatus = session.status;
    session.status = 'suspended';
    session.updatedAt = new Date();
    session.metadata.custom.suspendReason = reason;

    await this.cacheSession(session);
    await this.updateSessionInPostgres(session);

    this.emitSessionEvent({
      type: 'status_changed',
      sessionId,
      oldStatus,
      newStatus: 'suspended',
    });
  }

  async resumeSession(sessionId: string): Promise<Session | null> {
    const session = await this.getSession(sessionId);
    if (!session || session.status !== 'suspended') return null;

    session.status = 'active';
    session.lastActivityAt = new Date();
    session.updatedAt = new Date();
    session.expiresAt = new Date(Date.now() + this.config.defaultTtlSeconds! * 1000);
    delete session.metadata.custom.suspendReason;

    await this.cacheSession(session);
    await this.updateSessionInPostgres(session);

    this.emitSessionEvent({
      type: 'status_changed',
      sessionId,
      oldStatus: 'suspended',
      newStatus: 'active',
    });

    return session;
  }

  async expireSession(sessionId: string, reason?: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) return;

    session.status = 'expired';
    session.updatedAt = new Date();
    session.metadata.custom.expireReason = reason;

    // Persist final state to PostgreSQL
    await this.persistSession(session);

    // Remove from cache
    this.localCache.delete(sessionId);
    await this.redis.del(`session:${sessionId}`);

    this.emitSessionEvent({
      type: 'expired',
      sessionId,
    });
  }

  // ===========================================================================
  // CROSS-CHANNEL HANDOFF
  // ===========================================================================

  async handoffSession(
    fromSessionId: string,
    toParams: {
      platform: Session['platform'];
      channelId: string;
      threadId?: string;
    }
  ): Promise<Session | null> {
    if (!this.config.enableCrossChannel) {
      throw new Error('Cross-channel handoff is disabled');
    }

    const fromSession = await this.getSession(fromSessionId);
    if (!fromSession) return null;

    // Create new session with context from old session
    const toSession = await this.createSession({
      userId: fromSession.userId,
      tenantId: fromSession.tenantId,
      platform: toParams.platform,
      channelId: toParams.channelId,
      threadId: toParams.threadId,
      securityContext: fromSession.securityContext,
      metadata: {
        ...fromSession.metadata,
        parentSessionId: fromSession.id,
        linkedSessions: [
          ...(fromSession.metadata.linkedSessions || []),
          fromSession.id,
        ],
      },
    });

    // Copy conversation context
    toSession.turns = [...fromSession.turns];
    toSession.summary = fromSession.summary;
    toSession.extractedEntities = [...fromSession.extractedEntities];

    await this.cacheSession(toSession);

    // Link sessions bidirectionally
    fromSession.metadata.linkedSessions = [
      ...(fromSession.metadata.linkedSessions || []),
      toSession.id,
    ];
    await this.cacheSession(fromSession);

    this.emitSessionEvent({
      type: 'handoff',
      fromSessionId,
      toSessionId: toSession.id,
    });

    return toSession;
  }

  async linkSessions(sessionId1: string, sessionId2: string): Promise<void> {
    const session1 = await this.getSession(sessionId1);
    const session2 = await this.getSession(sessionId2);

    if (!session1 || !session2) {
      throw new Error('One or both sessions not found');
    }

    // Verify same user
    if (session1.userId !== session2.userId) {
      throw new Error('Cannot link sessions from different users');
    }

    session1.metadata.linkedSessions = [
      ...(session1.metadata.linkedSessions || []),
      sessionId2,
    ];
    session2.metadata.linkedSessions = [
      ...(session2.metadata.linkedSessions || []),
      sessionId1,
    ];

    await Promise.all([
      this.cacheSession(session1),
      this.cacheSession(session2),
    ]);
  }

  async getLinkedSessions(sessionId: string): Promise<Session[]> {
    const session = await this.getSession(sessionId);
    if (!session?.metadata.linkedSessions?.length) return [];

    const sessions = await Promise.all(
      session.metadata.linkedSessions.map(id => this.getSession(id))
    );

    return sessions.filter((s): s is Session => s !== null);
  }

  // ===========================================================================
  // QUERIES
  // ===========================================================================

  async findActiveSession(
    userId: string,
    platform: Session['platform'],
    channelId: string,
    threadId?: string
  ): Promise<Session | null> {
    // Check Redis first using secondary index
    const sessionIds = await this.redis.smembers(`user:${userId}:sessions`);

    for (const sessionId of sessionIds) {
      const session = await this.getSession(sessionId);
      if (
        session &&
        session.status === 'active' &&
        session.platform === platform &&
        session.channelId === channelId &&
        session.threadId === threadId
      ) {
        return session;
      }
    }

    return null;
  }

  async getActiveSessionsForUser(userId: string): Promise<Session[]> {
    const sessionIds = await this.redis.smembers(`user:${userId}:sessions`);
    const sessions: Session[] = [];

    for (const sessionId of sessionIds) {
      const session = await this.getSession(sessionId);
      if (session && (session.status === 'active' || session.status === 'idle')) {
        sessions.push(session);
      }
    }

    return sessions;
  }

  async getSessionsByTenant(tenantId: string, options?: {
    status?: Session['status'];
    platform?: Session['platform'];
    limit?: number;
    offset?: number;
  }): Promise<Session[]> {
    let query = `
      SELECT * FROM chatops_sessions
      WHERE tenant_id = $1
    `;
    const params: unknown[] = [tenantId];

    if (options?.status) {
      params.push(options.status);
      query += ` AND status = $${params.length}`;
    }

    if (options?.platform) {
      params.push(options.platform);
      query += ` AND platform = $${params.length}`;
    }

    query += ` ORDER BY last_activity_at DESC`;

    if (options?.limit) {
      params.push(options.limit);
      query += ` LIMIT $${params.length}`;
    }

    if (options?.offset) {
      params.push(options.offset);
      query += ` OFFSET $${params.length}`;
    }

    const result = await this.postgres.query(query, params);
    return result.rows.map(row => this.rowToSession(row));
  }

  async getSessionStats(tenantId?: string): Promise<SessionStats> {
    let whereClause = '';
    const params: unknown[] = [];

    if (tenantId) {
      params.push(tenantId);
      whereClause = `WHERE tenant_id = $1`;
    }

    const statsQuery = `
      SELECT
        COUNT(*) as total_sessions,
        COUNT(*) FILTER (WHERE status = 'active') as active_sessions,
        COUNT(*) FILTER (WHERE status = 'idle') as idle_sessions,
        AVG(turn_count) as avg_turns,
        AVG(EXTRACT(EPOCH FROM (last_activity_at - created_at)) * 1000) as avg_duration_ms,
        platform,
        tenant_id
      FROM chatops_sessions
      ${whereClause}
      GROUP BY platform, tenant_id
    `;

    const result = await this.postgres.query(statsQuery, params);

    const stats: SessionStats = {
      totalSessions: 0,
      activeSessions: 0,
      idleSessions: 0,
      avgTurnsPerSession: 0,
      avgSessionDurationMs: 0,
      sessionsByPlatform: {},
      sessionsByTenant: {},
    };

    for (const row of result.rows) {
      stats.totalSessions += parseInt(row.total_sessions, 10);
      stats.activeSessions += parseInt(row.active_sessions, 10);
      stats.idleSessions += parseInt(row.idle_sessions, 10);
      stats.sessionsByPlatform[row.platform] =
        (stats.sessionsByPlatform[row.platform] || 0) + parseInt(row.total_sessions, 10);
      stats.sessionsByTenant[row.tenant_id] =
        (stats.sessionsByTenant[row.tenant_id] || 0) + parseInt(row.total_sessions, 10);
    }

    if (result.rows.length > 0) {
      stats.avgTurnsPerSession =
        result.rows.reduce((sum, r) => sum + parseFloat(r.avg_turns || 0), 0) / result.rows.length;
      stats.avgSessionDurationMs =
        result.rows.reduce((sum, r) => sum + parseFloat(r.avg_duration_ms || 0), 0) / result.rows.length;
    }

    return stats;
  }

  // ===========================================================================
  // CLEANUP
  // ===========================================================================

  private async cleanupExpiredSessions(): Promise<void> {
    const now = Date.now();

    // Check local cache for expired sessions
    for (const [sessionId, session] of this.localCache) {
      if (session.expiresAt.getTime() < now) {
        await this.expireSession(sessionId, 'ttl_expired');
      } else if (
        session.status === 'active' &&
        session.lastActivityAt.getTime() + this.config.maxIdleSeconds! * 1000 < now
      ) {
        // Mark as idle
        session.status = 'idle';
        await this.cacheSession(session);
        this.emitSessionEvent({
          type: 'status_changed',
          sessionId,
          oldStatus: 'active',
          newStatus: 'idle',
        });
      }
    }

    // Cleanup expired sessions in PostgreSQL
    await this.postgres.query(`
      UPDATE chatops_sessions
      SET status = 'expired', updated_at = NOW()
      WHERE status IN ('active', 'idle')
        AND expires_at < NOW()
    `);
  }

  // ===========================================================================
  // PERSISTENCE
  // ===========================================================================

  private async cacheSession(session: Session): Promise<void> {
    this.localCache.set(session.id, session);

    const ttl = Math.max(
      1,
      Math.floor((session.expiresAt.getTime() - Date.now()) / 1000)
    );

    await this.redis.setex(
      `session:${session.id}`,
      ttl,
      JSON.stringify(this.serializeSession(session))
    );

    // Update user -> sessions index
    await this.redis.sadd(`user:${session.userId}:sessions`, session.id);
    await this.redis.expire(`user:${session.userId}:sessions`, ttl);
  }

  private async persistSession(session: Session): Promise<void> {
    await this.updateSessionInPostgres(session);

    // Persist all turns
    for (const turn of session.turns) {
      await this.insertTurnToPostgres(session.id, turn);
    }
  }

  private async insertSessionToPostgres(session: Session): Promise<void> {
    await this.postgres.query(
      `
      INSERT INTO chatops_sessions (
        id, user_id, tenant_id, platform, channel_id, thread_id,
        status, security_context, metadata, summary, turn_count,
        created_at, updated_at, expires_at, last_activity_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      ON CONFLICT (id) DO NOTHING
      `,
      [
        session.id,
        session.userId,
        session.tenantId,
        session.platform,
        session.channelId,
        session.threadId,
        session.status,
        JSON.stringify(session.securityContext),
        JSON.stringify(session.metadata),
        session.summary,
        session.turns.length,
        session.createdAt,
        session.updatedAt,
        session.expiresAt,
        session.lastActivityAt,
      ]
    );
  }

  private async updateSessionInPostgres(session: Session): Promise<void> {
    await this.postgres.query(
      `
      UPDATE chatops_sessions SET
        status = $2,
        security_context = $3,
        metadata = $4,
        summary = $5,
        turn_count = $6,
        updated_at = $7,
        expires_at = $8,
        last_activity_at = $9
      WHERE id = $1
      `,
      [
        session.id,
        session.status,
        JSON.stringify(session.securityContext),
        JSON.stringify(session.metadata),
        session.summary,
        session.turns.length,
        session.updatedAt,
        session.expiresAt,
        session.lastActivityAt,
      ]
    );
  }

  private async insertTurnToPostgres(sessionId: string, turn: ConversationTurn): Promise<void> {
    await this.postgres.query(
      `
      INSERT INTO chatops_turns (
        id, session_id, role, content, token_count, entities, metadata, timestamp
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (id) DO NOTHING
      `,
      [
        turn.id,
        sessionId,
        turn.role,
        turn.content,
        turn.tokenCount,
        JSON.stringify(turn.entities || []),
        JSON.stringify(turn.metadata || {}),
        turn.timestamp,
      ]
    );
  }

  // ===========================================================================
  // SERIALIZATION
  // ===========================================================================

  private serializeSession(session: Session): Record<string, unknown> {
    return {
      ...session,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
      expiresAt: session.expiresAt.toISOString(),
      lastActivityAt: session.lastActivityAt.toISOString(),
      turns: session.turns.map(turn => ({
        ...turn,
        timestamp: turn.timestamp.toISOString(),
      })),
    };
  }

  private deserializeSession(data: Record<string, unknown>): Session {
    return {
      ...data,
      createdAt: new Date(data.createdAt as string),
      updatedAt: new Date(data.updatedAt as string),
      expiresAt: new Date(data.expiresAt as string),
      lastActivityAt: new Date(data.lastActivityAt as string),
      turns: (data.turns as Array<Record<string, unknown>>).map(turn => ({
        ...turn,
        timestamp: new Date(turn.timestamp as string),
      })),
    } as Session;
  }

  private rowToSession(row: Record<string, unknown>): Session {
    return {
      id: row.id as string,
      userId: row.user_id as string,
      tenantId: row.tenant_id as string,
      platform: row.platform as Session['platform'],
      channelId: row.channel_id as string,
      threadId: row.thread_id as string | undefined,
      status: row.status as Session['status'],
      securityContext: row.security_context as SecurityContext,
      metadata: row.metadata as SessionMetadata,
      turns: [],
      summary: row.summary as string | undefined,
      extractedEntities: [],
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
      expiresAt: new Date(row.expires_at as string),
      lastActivityAt: new Date(row.last_activity_at as string),
    };
  }

  // ===========================================================================
  // EVENTS
  // ===========================================================================

  private emitSessionEvent(event: SessionEvent): void {
    this.emit('session:event', event);

    // Publish to Redis for cross-instance synchronization
    this.redis.publish('chatops:session:events', JSON.stringify(event));
  }

  private handleRedisEvent(_channel: string, message: string): void {
    try {
      const event = JSON.parse(message) as SessionEvent;

      // Handle cache invalidation for remote updates
      if (event.type === 'expired' || event.type === 'terminated') {
        this.localCache.delete(event.sessionId);
      }
    } catch (error) {
      console.error('[SessionManager] Error handling Redis event:', error);
    }
  }
}

// =============================================================================
// FACTORY
// =============================================================================

export function createSessionManager(config: SessionConfig): SessionManager {
  return new SessionManager(config);
}
