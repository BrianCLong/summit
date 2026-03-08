"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deduplicationService = exports.DeduplicationService = void 0;
// @ts-nocheck
const pg_js_1 = require("../db/pg.js");
const neo4j_js_1 = require("../db/neo4j.js");
const pubsub_js_1 = require("../subscriptions/pubsub.js");
const api_1 = require("@opentelemetry/api");
const prom_client_1 = require("prom-client");
const crypto_1 = __importDefault(require("crypto"));
const tracer = api_1.trace.getTracer('deduplication', '24.2.0');
// Metrics
const dedupeChecks = new prom_client_1.Counter({
    name: 'dedupe_checks_total',
    help: 'Total deduplication checks performed',
    labelNames: ['tenant_id', 'result'],
});
const dedupeLatency = new prom_client_1.Histogram({
    name: 'dedupe_check_duration_seconds',
    help: 'Time spent on deduplication checks',
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1.0],
    labelNames: ['method'],
});
const duplicateRate = new prom_client_1.Counter({
    name: 'ingest_duplicates_total',
    help: 'Total duplicate signals detected',
    labelNames: ['tenant_id', 'type', 'method'],
});
class DeduplicationService {
    redisKeyPrefix = 'dedupe';
    redisTTL = 3600; // 1 hour
    postgresWindow = 300; // 5 minutes for PG check
    async checkDuplicate(signal) {
        return tracer.startActiveSpan('dedupe.check', async (span) => {
            span.setAttributes({
                tenant_id: signal.tenantId,
                signal_type: signal.type,
            });
            try {
                // Generate deduplication hash
                const dedupeHash = this.generateDedupeHash(signal);
                // Fast path: Redis bloom filter / set check
                const isRedisCache = await this.checkRedisCache(dedupeHash, signal.tenantId);
                if (isRedisCache) {
                    dedupeChecks.inc({
                        tenant_id: signal.tenantId,
                        result: 'duplicate_redis',
                    });
                    duplicateRate.inc({
                        tenant_id: signal.tenantId,
                        type: signal.type,
                        method: 'redis',
                    });
                    return true; // Duplicate found in cache
                }
                // Slower path: Database check for recent duplicates
                const isDbDupe = await this.checkDatabaseDuplicate(signal, dedupeHash);
                if (isDbDupe) {
                    dedupeChecks.inc({
                        tenant_id: signal.tenantId,
                        result: 'duplicate_db',
                    });
                    duplicateRate.inc({
                        tenant_id: signal.tenantId,
                        type: signal.type,
                        method: 'database',
                    });
                    // Cache the duplicate for future fast lookups
                    await this.cacheDedupeHash(dedupeHash, signal.tenantId);
                    return true; // Duplicate found in database
                }
                // Not a duplicate - cache the hash and allow processing
                await this.cacheDedupeHash(dedupeHash, signal.tenantId);
                dedupeChecks.inc({ tenant_id: signal.tenantId, result: 'unique' });
                return false; // Not a duplicate
            }
            catch (error) {
                span.recordException(error);
                span.setStatus({ code: 2, message: error.message });
                dedupeChecks.inc({ tenant_id: signal.tenantId, result: 'error' });
                console.error('Deduplication check failed:', error);
                // Fail open - allow processing if deduplication fails
                return false;
            }
            finally {
                span.end();
            }
        });
    }
    generateDedupeHash(signal) {
        // Create hash based on key fields that define uniqueness
        const keyString = [
            signal.tenantId,
            signal.type,
            signal.value.toString(),
            this.normalizeTimestamp(signal.timestamp),
            signal.source || '',
        ].join('|');
        return crypto_1.default.createHash('sha256').update(keyString).digest('hex');
    }
    normalizeTimestamp(timestamp) {
        // Round timestamp to nearest minute to handle slight timing differences
        const date = new Date(timestamp);
        date.setSeconds(0, 0); // Zero out seconds and milliseconds
        return date.toISOString();
    }
    async checkRedisCache(dedupeHash, tenantId) {
        const startTime = Date.now();
        try {
            const key = `${this.redisKeyPrefix}:${tenantId}:${dedupeHash}`;
            const exists = await pubsub_js_1.redis.get(key);
            dedupeLatency.observe({ method: 'redis' }, (Date.now() - startTime) / 1000);
            return exists !== null;
        }
        catch (error) {
            console.error('Redis dedupe check failed:', error);
            return false; // Fail open
        }
    }
    async cacheDedupeHash(dedupeHash, tenantId) {
        try {
            const key = `${this.redisKeyPrefix}:${tenantId}:${dedupeHash}`;
            await pubsub_js_1.redis.setWithTTL(key, '1', this.redisTTL);
        }
        catch (error) {
            console.error('Failed to cache dedupe hash:', error);
            // Non-critical error, continue processing
        }
    }
    async checkDatabaseDuplicate(signal, dedupeHash) {
        const startTime = Date.now();
        try {
            // Check PostgreSQL for recent coherence score updates
            const pgResult = await this.checkPostgresDuplicate(signal);
            // Check Neo4j for recent signal nodes
            const neoResult = await this.checkNeo4jDuplicate(signal, dedupeHash);
            dedupeLatency.observe({ method: 'database' }, (Date.now() - startTime) / 1000);
            return pgResult || neoResult;
        }
        catch (error) {
            console.error('Database dedupe check failed:', error);
            return false; // Fail open
        }
    }
    async checkPostgresDuplicate(signal) {
        // Check for recent updates with similar characteristics
        const windowStart = new Date(Date.now() - this.postgresWindow * 1000);
        const result = await pg_js_1.pg.oneOrNone(`
      SELECT 1 FROM coherence_scores 
      WHERE tenant_id = $1 
        AND updated_at >= $2 
        AND abs(score - $3) < 0.001
      LIMIT 1
    `, [signal.tenantId, windowStart, signal.value]);
        return result !== null;
    }
    async checkNeo4jDuplicate(signal, dedupeHash) {
        // Check for signal nodes with exact match
        const result = await neo4j_js_1.neo.run(`
      MATCH (s:Signal) 
      WHERE s.tenant_id = $tenantId
        AND s.id = $dedupeHash
      RETURN s.id LIMIT 1
    `, {
            tenantId: signal.tenantId,
            dedupeHash,
        });
        return result.records.length > 0;
    }
    async batchCheckDuplicates(signals) {
        return tracer.startActiveSpan('dedupe.batch_check', async (span) => {
            span.setAttributes({
                batch_size: signals.length,
            });
            try {
                // Process in parallel for better performance
                const promises = signals.map((signal) => this.checkDuplicate(signal));
                return await Promise.all(promises);
            }
            catch (error) {
                span.recordException(error);
                span.setStatus({ code: 2, message: error.message });
                throw error;
            }
            finally {
                span.end();
            }
        });
    }
    async initializeDatabaseIndexes() {
        console.log('Initializing deduplication database indexes...');
        try {
            // PostgreSQL indexes for coherence_scores deduplication
            await pg_js_1.pg.oneOrNone(`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_coherence_scores_dedupe 
        ON coherence_scores (tenant_id, updated_at DESC, score);
      `);
            console.log('PostgreSQL deduplication indexes created');
            // Neo4j indexes for signal deduplication
            await neo4j_js_1.neo.run(`
        CREATE INDEX signal_dedupe_index IF NOT EXISTS 
        FOR (s:Signal) ON (s.tenant_id, s.id);
      `);
            console.log('Neo4j deduplication indexes created');
        }
        catch (error) {
            console.error('Failed to create deduplication indexes:', error);
            throw error;
        }
    }
    getDeduplicationStats() {
        // Return current deduplication metrics
        return {
            redisKeyPrefix: this.redisKeyPrefix,
            redisTTL: this.redisTTL,
            postgresWindow: this.postgresWindow,
            timestamp: new Date().toISOString(),
        };
    }
}
exports.DeduplicationService = DeduplicationService;
exports.deduplicationService = new DeduplicationService();
