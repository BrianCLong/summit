"use strict";
/**
 * Policy-Aware Cache Service with Cryptographic Proofs
 *
 * Features:
 * - Cache keys incorporate query hash, policy version, user ABAC attributes, and data snapshot
 * - Generates cryptographic proofs for cache hits
 * - Automatic invalidation on policy or data changes
 * - Audit trail integration
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolicyAwareCacheService = void 0;
const redis_1 = require("redis");
const crypto_1 = require("crypto");
const pg_1 = require("pg");
class PolicyAwareCacheService {
    redisClient = null;
    dbPool = null;
    namespace;
    defaultTTL;
    secretKey;
    enableAuditLog;
    metricsCache = new Map();
    constructor(config = {}) {
        this.namespace = config.namespace || 'policy-cache';
        this.defaultTTL = config.defaultTTL || 3600; // 1 hour default
        this.secretKey = config.secretKey || process.env.CACHE_SECRET_KEY || 'dev-secret-key';
        this.enableAuditLog = config.enableAuditLog !== false;
        // Initialize Redis
        const redisUrl = config.redisUrl ||
            process.env.REDIS_URL ||
            (process.env.REDIS_HOST
                ? `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT || '6379'}`
                : undefined);
        if (redisUrl) {
            this.redisClient = (0, redis_1.createClient)({ url: redisUrl });
            this.redisClient.on('error', (err) => console.warn('[POLICY-CACHE] Redis error:', err));
            this.redisClient
                .connect()
                .then(() => console.log('[POLICY-CACHE] Redis connected'))
                .catch((e) => console.warn('[POLICY-CACHE] Redis connection failed:', e));
        }
        else {
            console.warn('[POLICY-CACHE] No Redis configured, cache disabled');
        }
        // Initialize PostgreSQL for audit log
        if (this.enableAuditLog) {
            const databaseUrl = config.databaseUrl ||
                process.env.DATABASE_URL ||
                'postgres://postgres:postgres@localhost:5432/intelgraph';
            this.dbPool = new pg_1.Pool({
                connectionString: databaseUrl,
                max: 10,
                idleTimeoutMillis: 30000,
                connectionTimeoutMillis: 2000,
            });
        }
    }
    /**
     * Build composite cache key from components
     */
    buildCacheKey(components) {
        const { queryHash, paramsHash, policyVersion, userAttributes, dataSnapshot } = components;
        // Hash user attributes to avoid overly long keys
        const userHash = this.hashObject({
            userId: userAttributes.userId,
            roles: userAttributes.roles.sort(), // Sort for consistency
            clearanceLevel: userAttributes.clearanceLevel,
            organizationId: userAttributes.organizationId,
            compartments: userAttributes.compartments?.sort(),
        });
        // Build composite key
        const key = [
            this.namespace,
            queryHash.substring(0, 16), // Use first 16 chars for readability
            paramsHash.substring(0, 16),
            `pol:${policyVersion.version}:${policyVersion.digest.substring(0, 12)}`,
            `usr:${userHash.substring(0, 12)}`,
            `data:${dataSnapshot.snapshotId}`,
        ].join(':');
        return key;
    }
    /**
     * Get cached result with proof
     */
    async get(components) {
        if (!this.redisClient)
            return null;
        const cacheKey = this.buildCacheKey(components);
        const startTime = Date.now();
        try {
            const raw = await this.redisClient.get(cacheKey);
            if (!raw) {
                console.log(`[POLICY-CACHE] Cache miss: ${cacheKey}`);
                this.recordMetric('miss', cacheKey, components);
                return null;
            }
            const entry = JSON.parse(raw);
            // Check expiry
            if (Date.now() >= entry.expiresAt) {
                console.log(`[POLICY-CACHE] Cache expired: ${cacheKey}`);
                await this.redisClient.del(cacheKey);
                this.recordMetric('miss', cacheKey, components);
                return null;
            }
            // Update retrievedAt in proof
            const proof = {
                ...entry.result.proof,
                retrievedAt: new Date().toISOString(),
            };
            // Re-sign proof
            proof.signature = this.signProof(proof);
            const result = {
                ...entry.result,
                proof,
            };
            const duration = Date.now() - startTime;
            console.log(`[POLICY-CACHE] Cache hit: ${cacheKey} (${duration}ms)`);
            this.recordMetric('hit', cacheKey, components);
            // Audit log
            await this.auditCacheAccess('hit', cacheKey, components);
            return result;
        }
        catch (error) {
            console.error('[POLICY-CACHE] Get error:', error);
            return null;
        }
    }
    /**
     * Set cached result with proof generation
     */
    async set(components, data, options) {
        if (!this.redisClient) {
            throw new Error('Redis not configured');
        }
        const cacheKey = this.buildCacheKey(components);
        const ttl = options?.ttl || this.defaultTTL;
        const cachedAt = new Date().toISOString();
        const expiresAt = Date.now() + ttl * 1000;
        // Hash user attributes for proof
        const userSnapshot = {
            userId: components.userAttributes.userId,
            rolesHash: this.hashObject(components.userAttributes.roles.sort()),
            attributesHash: this.hashObject(components.userAttributes),
        };
        // Build proof bundle
        const proof = {
            cacheKey,
            queryHash: components.queryHash,
            paramsHash: components.paramsHash,
            policyDigest: components.policyVersion.digest,
            policyVersion: components.policyVersion.version,
            userSnapshot,
            dataSnapshot: components.dataSnapshot,
            cachedAt,
            retrievedAt: cachedAt,
            ttl,
            signature: '', // Will be set below
            provenance: options?.computedBy
                ? {
                    computedBy: options.computedBy,
                    computedAt: cachedAt,
                    inputSources: options.inputSources || [],
                }
                : undefined,
        };
        // Sign the proof
        proof.signature = this.signProof(proof);
        // Build cached result
        const result = {
            data,
            proof,
            metadata: options?.metadata,
        };
        // Build cache entry
        const entry = {
            result,
            expiresAt,
        };
        // Store in Redis
        await this.redisClient.set(cacheKey, JSON.stringify(entry), {
            EX: ttl,
        });
        console.log(`[POLICY-CACHE] Cached: ${cacheKey} (TTL: ${ttl}s)`);
        this.recordMetric('set', cacheKey, components);
        // Audit log
        await this.auditCacheAccess('set', cacheKey, components);
        // Store invalidation metadata for future lookups
        await this.storeInvalidationMetadata(cacheKey, components);
        return result;
    }
    /**
     * Invalidate cache entries matching criteria
     */
    async invalidate(event) {
        if (!this.redisClient)
            return 0;
        let invalidatedCount = 0;
        for (const pattern of event.keyPatterns) {
            const fullPattern = pattern.includes(':') ? pattern : `${this.namespace}:${pattern}*`;
            // Scan and delete matching keys
            for await (const key of this.scanKeys(fullPattern)) {
                await this.redisClient.del(key);
                invalidatedCount++;
            }
        }
        console.log(`[POLICY-CACHE] Invalidated ${invalidatedCount} entries (${event.type}): ${event.reason}`);
        // Store invalidation event
        await this.storeInvalidationEvent(event);
        return invalidatedCount;
    }
    /**
     * Invalidate all entries for a specific policy version
     */
    async invalidateByPolicy(oldVersion, newVersion, initiatedBy) {
        const event = {
            type: 'policy_change',
            timestamp: new Date().toISOString(),
            reason: `Policy updated from ${oldVersion.version} to ${newVersion.version}`,
            keyPatterns: [`*:pol:${oldVersion.version}:*`],
            initiatedBy,
            changes: {
                old: oldVersion,
                new: newVersion,
            },
        };
        return this.invalidate(event);
    }
    /**
     * Invalidate all entries for a specific data snapshot
     */
    async invalidateByDataSnapshot(oldSnapshot, newSnapshot, initiatedBy) {
        const event = {
            type: 'data_change',
            timestamp: new Date().toISOString(),
            reason: `Data snapshot updated from ${oldSnapshot.snapshotId} to ${newSnapshot.snapshotId}`,
            keyPatterns: [`*:data:${oldSnapshot.snapshotId}*`],
            initiatedBy,
            changes: {
                old: oldSnapshot,
                new: newSnapshot,
            },
        };
        return this.invalidate(event);
    }
    /**
     * Explain cache key - breakdown and metadata
     */
    async explain(key) {
        if (!this.redisClient) {
            throw new Error('Redis not configured');
        }
        // Parse key components
        const parts = key.split(':');
        const components = this.parseKeyComponents(key);
        // Check if key exists
        const exists = !!(await this.redisClient.exists(key));
        const explain = {
            key,
            exists,
            components,
        };
        if (exists) {
            const raw = await this.redisClient.get(key);
            if (raw) {
                const entry = JSON.parse(raw);
                explain.proof = entry.result.proof;
                explain.dataMetadata = {
                    size: JSON.stringify(entry.result.data).length,
                    type: typeof entry.result.data,
                    cachedAt: entry.result.proof.cachedAt,
                    expiresAt: new Date(entry.expiresAt).toISOString(),
                    ttl: Math.floor((entry.expiresAt - Date.now()) / 1000),
                };
            }
        }
        // Get invalidation history
        explain.invalidationHistory = await this.getInvalidationHistory(key);
        return explain;
    }
    /**
     * Get cache statistics
     */
    async getStats() {
        if (!this.redisClient) {
            return {
                totalEntries: 0,
                hitRate: 0,
                missRate: 0,
                avgTTL: 0,
                byPolicyVersion: {},
                byUser: {},
            };
        }
        let totalEntries = 0;
        const byPolicyVersion = {};
        const byUser = {};
        // Scan all cache keys
        for await (const key of this.scanKeys(`${this.namespace}:*`)) {
            totalEntries++;
            // Extract policy version
            const policyMatch = key.match(/pol:([^:]+):/);
            if (policyMatch) {
                const version = policyMatch[1];
                byPolicyVersion[version] = (byPolicyVersion[version] || 0) + 1;
            }
            // Extract user hash (for anonymized stats)
            const userMatch = key.match(/usr:([^:]+):/);
            if (userMatch) {
                const userHash = userMatch[1];
                byUser[userHash] = (byUser[userHash] || 0) + 1;
            }
        }
        // Calculate hit/miss rates from metrics
        const metrics = Array.from(this.metricsCache.values());
        const hits = metrics.filter((m) => m.type === 'hit').length;
        const misses = metrics.filter((m) => m.type === 'miss').length;
        const total = hits + misses || 1; // Avoid division by zero
        return {
            totalEntries,
            hitRate: hits / total,
            missRate: misses / total,
            avgTTL: this.defaultTTL,
            byPolicyVersion,
            byUser,
        };
    }
    /**
     * Clear all cache entries
     */
    async clear() {
        if (!this.redisClient)
            return 0;
        let count = 0;
        for await (const key of this.scanKeys(`${this.namespace}:*`)) {
            await this.redisClient.del(key);
            count++;
        }
        console.log(`[POLICY-CACHE] Cleared ${count} entries`);
        return count;
    }
    /**
     * Verify proof signature
     */
    verifyProof(proof) {
        const expectedSignature = this.signProof(proof);
        return proof.signature === expectedSignature;
    }
    // ============================================================================
    // Private Helper Methods
    // ============================================================================
    hashObject(obj) {
        const sorted = JSON.stringify(obj, Object.keys(obj).sort());
        return (0, crypto_1.createHash)('sha256').update(sorted).digest('hex');
    }
    signProof(proof) {
        // Create canonical representation (excluding signature field)
        const { signature, ...proofData } = proof;
        const canonical = JSON.stringify(proofData, Object.keys(proofData).sort());
        // HMAC signature
        return (0, crypto_1.createHmac)('sha256', this.secretKey).update(canonical).digest('hex');
    }
    async *scanKeys(pattern) {
        if (!this.redisClient)
            return;
        let cursor = 0;
        do {
            const res = await this.redisClient.scan(cursor, {
                MATCH: pattern,
                COUNT: 1000,
            });
            cursor = res.cursor;
            const keys = res.keys || [];
            for (const key of keys)
                yield key;
        } while (cursor !== 0);
    }
    parseKeyComponents(key) {
        const parts = key.split(':');
        // This is a simplified parser - in production, store metadata separately
        return {
            queryHash: parts[1] || '',
            paramsHash: parts[2] || '',
            policyVersion: {
                version: parts[3]?.split(':')[1] || '',
                digest: parts[3]?.split(':')[2] || '',
                effectiveDate: new Date().toISOString(),
            },
            userAttributes: {
                userId: 'parsed-from-key',
                roles: [],
            },
            dataSnapshot: {
                snapshotId: parts[5]?.split(':')[1] || '',
                timestamp: new Date().toISOString(),
                dataHash: '',
            },
        };
    }
    recordMetric(type, key, components) {
        const metric = {
            type,
            key,
            timestamp: Date.now(),
            policyVersion: components.policyVersion.version,
            userId: components.userAttributes.userId,
        };
        this.metricsCache.set(`${type}-${Date.now()}`, metric);
        // Keep only last 10000 metrics
        if (this.metricsCache.size > 10000) {
            const firstKey = this.metricsCache.keys().next().value;
            this.metricsCache.delete(firstKey);
        }
    }
    async auditCacheAccess(action, key, components) {
        if (!this.enableAuditLog || !this.dbPool)
            return;
        try {
            await this.dbPool.query(`INSERT INTO cache_audit_log (action, cache_key, policy_version, user_id, timestamp)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT DO NOTHING`, [
                action,
                key,
                components.policyVersion.version,
                components.userAttributes.userId,
                new Date(),
            ]);
        }
        catch (error) {
            console.warn('[POLICY-CACHE] Audit log error:', error);
        }
    }
    async storeInvalidationMetadata(key, components) {
        if (!this.dbPool)
            return;
        try {
            await this.dbPool.query(`INSERT INTO cache_metadata (cache_key, policy_version, policy_digest, data_snapshot_id, created_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (cache_key) DO UPDATE SET created_at = $5`, [
                key,
                components.policyVersion.version,
                components.policyVersion.digest,
                components.dataSnapshot.snapshotId,
                new Date(),
            ]);
        }
        catch (error) {
            // Table might not exist yet
            console.debug('[POLICY-CACHE] Metadata storage skipped:', error);
        }
    }
    async storeInvalidationEvent(event) {
        if (!this.dbPool)
            return;
        try {
            await this.dbPool.query(`INSERT INTO cache_invalidation_log (type, timestamp, reason, key_patterns, initiated_by, changes)
         VALUES ($1, $2, $3, $4, $5, $6)`, [
                event.type,
                new Date(event.timestamp),
                event.reason,
                JSON.stringify(event.keyPatterns),
                event.initiatedBy,
                JSON.stringify(event.changes || {}),
            ]);
        }
        catch (error) {
            console.debug('[POLICY-CACHE] Invalidation log skipped:', error);
        }
    }
    async getInvalidationHistory(key) {
        if (!this.dbPool)
            return [];
        try {
            const result = await this.dbPool.query(`SELECT * FROM cache_invalidation_log
         WHERE $1 LIKE ANY(SELECT jsonb_array_elements_text(key_patterns::jsonb))
         ORDER BY timestamp DESC LIMIT 10`, [key]);
            return result.rows.map((row) => ({
                type: row.type,
                timestamp: row.timestamp.toISOString(),
                reason: row.reason,
                keyPatterns: JSON.parse(row.key_patterns),
                initiatedBy: row.initiated_by,
                changes: row.changes,
            }));
        }
        catch (error) {
            return [];
        }
    }
    async close() {
        if (this.redisClient) {
            await this.redisClient.quit();
        }
        if (this.dbPool) {
            await this.dbPool.end();
        }
    }
}
exports.PolicyAwareCacheService = PolicyAwareCacheService;
