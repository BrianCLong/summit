"use strict";
// @ts-nocheck
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionManager = void 0;
exports.createSessionManager = createSessionManager;
const uuid_1 = require("uuid");
const events_1 = require("events");
// =============================================================================
// SESSION MANAGER
// =============================================================================
class SessionManager extends events_1.EventEmitter {
    config;
    postgres;
    redis;
    redisSub;
    cleanupInterval;
    localCache = new Map();
    constructor(config) {
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
    async initialize() {
        // Subscribe to session events
        await this.redisSub.subscribe('chatops:session:events');
        this.redisSub.on('message', this.handleRedisEvent.bind(this));
        // Start cleanup interval
        this.cleanupInterval = setInterval(() => this.cleanupExpiredSessions(), this.config.cleanupIntervalMs);
        console.log('[SessionManager] Initialized');
    }
    async shutdown() {
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
    async createSession(params) {
        // Check concurrent session limit
        const existingSessions = await this.getActiveSessionsForUser(params.userId);
        if (existingSessions.length >= this.config.maxConcurrentSessions) {
            // Expire oldest session
            const oldest = existingSessions.sort((a, b) => a.lastActivityAt.getTime() - b.lastActivityAt.getTime())[0];
            await this.expireSession(oldest.id, 'max_concurrent_sessions');
        }
        const now = new Date();
        const session = {
            id: (0, uuid_1.v4)(),
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
            expiresAt: new Date(now.getTime() + this.config.defaultTtlSeconds * 1000),
            lastActivityAt: now,
        };
        // Persist to Redis and PostgreSQL
        await this.cacheSession(session);
        await this.insertSessionToPostgres(session);
        // Emit event
        this.emitSessionEvent({ type: 'created', session });
        return session;
    }
    async getSession(sessionId) {
        // Check local cache first
        if (this.localCache.has(sessionId)) {
            return this.localCache.get(sessionId);
        }
        // Check Redis
        const cached = await this.redis.get(`session:${sessionId}`);
        if (cached) {
            const session = this.deserializeSession(JSON.parse(cached));
            this.localCache.set(sessionId, session);
            return session;
        }
        // Check PostgreSQL
        const result = await this.postgres.query(`SELECT * FROM chatops_sessions WHERE id = $1`, [sessionId]);
        if (result.rows[0]) {
            const session = this.rowToSession(result.rows[0]);
            await this.cacheSession(session);
            return session;
        }
        return null;
    }
    async getOrCreateSession(params) {
        // Look for existing active session in same channel/thread
        const existing = await this.findActiveSession(params.userId, params.platform, params.channelId, params.threadId);
        if (existing) {
            // Refresh the session
            await this.touchSession(existing.id);
            return existing;
        }
        // Create new session
        return this.createSession(params);
    }
    async updateSession(sessionId, updates) {
        const session = await this.getSession(sessionId);
        if (!session)
            return null;
        const updatedSession = {
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
    async deleteSession(sessionId) {
        this.localCache.delete(sessionId);
        await this.redis.del(`session:${sessionId}`);
        // Soft delete in PostgreSQL
        await this.postgres.query(`UPDATE chatops_sessions SET status = 'terminated', updated_at = NOW() WHERE id = $1`, [sessionId]);
        this.emitSessionEvent({
            type: 'terminated',
            sessionId,
            reason: 'deleted',
        });
    }
    // ===========================================================================
    // SESSION OPERATIONS
    // ===========================================================================
    async addTurn(sessionId, turn) {
        const session = await this.getSession(sessionId);
        if (!session) {
            throw new Error(`Session not found: ${sessionId}`);
        }
        // Check turn limit
        if (session.turns.length >= this.config.maxTurnsPerSession) {
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
    async touchSession(sessionId) {
        const session = await this.getSession(sessionId);
        if (!session)
            return;
        session.lastActivityAt = new Date();
        session.expiresAt = new Date(Date.now() + this.config.defaultTtlSeconds * 1000);
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
    async suspendSession(sessionId, reason) {
        const session = await this.getSession(sessionId);
        if (!session)
            return;
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
    async resumeSession(sessionId) {
        const session = await this.getSession(sessionId);
        if (!session || session.status !== 'suspended')
            return null;
        session.status = 'active';
        session.lastActivityAt = new Date();
        session.updatedAt = new Date();
        session.expiresAt = new Date(Date.now() + this.config.defaultTtlSeconds * 1000);
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
    async expireSession(sessionId, reason) {
        const session = await this.getSession(sessionId);
        if (!session)
            return;
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
    async handoffSession(fromSessionId, toParams) {
        if (!this.config.enableCrossChannel) {
            throw new Error('Cross-channel handoff is disabled');
        }
        const fromSession = await this.getSession(fromSessionId);
        if (!fromSession)
            return null;
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
    async linkSessions(sessionId1, sessionId2) {
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
    async getLinkedSessions(sessionId) {
        const session = await this.getSession(sessionId);
        if (!session?.metadata.linkedSessions?.length)
            return [];
        const sessions = await Promise.all(session.metadata.linkedSessions.map(id => this.getSession(id)));
        return sessions.filter((s) => s !== null);
    }
    // ===========================================================================
    // QUERIES
    // ===========================================================================
    async findActiveSession(userId, platform, channelId, threadId) {
        // Check Redis first using secondary index
        const sessionIds = await this.redis.smembers(`user:${userId}:sessions`);
        for (const sessionId of sessionIds) {
            const session = await this.getSession(sessionId);
            if (session &&
                session.status === 'active' &&
                session.platform === platform &&
                session.channelId === channelId &&
                session.threadId === threadId) {
                return session;
            }
        }
        return null;
    }
    async getActiveSessionsForUser(userId) {
        const sessionIds = await this.redis.smembers(`user:${userId}:sessions`);
        const sessions = [];
        for (const sessionId of sessionIds) {
            const session = await this.getSession(sessionId);
            if (session && (session.status === 'active' || session.status === 'idle')) {
                sessions.push(session);
            }
        }
        return sessions;
    }
    async getSessionsByTenant(tenantId, options) {
        let query = `
      SELECT * FROM chatops_sessions
      WHERE tenant_id = $1
    `;
        const params = [tenantId];
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
    async getSessionStats(tenantId) {
        let whereClause = '';
        const params = [];
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
        const stats = {
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
    async cleanupExpiredSessions() {
        const now = Date.now();
        // Check local cache for expired sessions
        for (const [sessionId, session] of this.localCache) {
            if (session.expiresAt.getTime() < now) {
                await this.expireSession(sessionId, 'ttl_expired');
            }
            else if (session.status === 'active' &&
                session.lastActivityAt.getTime() + this.config.maxIdleSeconds * 1000 < now) {
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
    async cacheSession(session) {
        this.localCache.set(session.id, session);
        const ttl = Math.max(1, Math.floor((session.expiresAt.getTime() - Date.now()) / 1000));
        await this.redis.setex(`session:${session.id}`, ttl, JSON.stringify(this.serializeSession(session)));
        // Update user -> sessions index
        await this.redis.sadd(`user:${session.userId}:sessions`, session.id);
        await this.redis.expire(`user:${session.userId}:sessions`, ttl);
    }
    async persistSession(session) {
        await this.updateSessionInPostgres(session);
        // Persist all turns
        for (const turn of session.turns) {
            await this.insertTurnToPostgres(session.id, turn);
        }
    }
    async insertSessionToPostgres(session) {
        await this.postgres.query(`
      INSERT INTO chatops_sessions (
        id, user_id, tenant_id, platform, channel_id, thread_id,
        status, security_context, metadata, summary, turn_count,
        created_at, updated_at, expires_at, last_activity_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      ON CONFLICT (id) DO NOTHING
      `, [
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
        ]);
    }
    async updateSessionInPostgres(session) {
        await this.postgres.query(`
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
      `, [
            session.id,
            session.status,
            JSON.stringify(session.securityContext),
            JSON.stringify(session.metadata),
            session.summary,
            session.turns.length,
            session.updatedAt,
            session.expiresAt,
            session.lastActivityAt,
        ]);
    }
    async insertTurnToPostgres(sessionId, turn) {
        await this.postgres.query(`
      INSERT INTO chatops_turns (
        id, session_id, role, content, token_count, entities, metadata, timestamp
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (id) DO NOTHING
      `, [
            turn.id,
            sessionId,
            turn.role,
            turn.content,
            turn.tokenCount,
            JSON.stringify(turn.entities || []),
            JSON.stringify(turn.metadata || {}),
            turn.timestamp,
        ]);
    }
    // ===========================================================================
    // SERIALIZATION
    // ===========================================================================
    serializeSession(session) {
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
    deserializeSession(data) {
        return {
            ...data,
            createdAt: new Date(data.createdAt),
            updatedAt: new Date(data.updatedAt),
            expiresAt: new Date(data.expiresAt),
            lastActivityAt: new Date(data.lastActivityAt),
            turns: data.turns.map(turn => ({
                ...turn,
                timestamp: new Date(turn.timestamp),
            })),
        };
    }
    rowToSession(row) {
        return {
            id: row.id,
            userId: row.user_id,
            tenantId: row.tenant_id,
            platform: row.platform,
            channelId: row.channel_id,
            threadId: row.thread_id,
            status: row.status,
            securityContext: row.security_context,
            metadata: row.metadata,
            turns: [],
            summary: row.summary,
            extractedEntities: [],
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
            expiresAt: new Date(row.expires_at),
            lastActivityAt: new Date(row.last_activity_at),
        };
    }
    // ===========================================================================
    // EVENTS
    // ===========================================================================
    emitSessionEvent(event) {
        this.emit('session:event', event);
        // Publish to Redis for cross-instance synchronization
        this.redis.publish('chatops:session:events', JSON.stringify(event));
    }
    handleRedisEvent(_channel, message) {
        try {
            const event = JSON.parse(message);
            // Handle cache invalidation for remote updates
            if (event.type === 'expired' || event.type === 'terminated') {
                this.localCache.delete(event.sessionId);
            }
        }
        catch (error) {
            console.error('[SessionManager] Error handling Redis event:', error);
        }
    }
}
exports.SessionManager = SessionManager;
// =============================================================================
// FACTORY
// =============================================================================
function createSessionManager(config) {
    return new SessionManager(config);
}
