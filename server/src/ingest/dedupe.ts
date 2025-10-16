import { pg } from '../db/pg';
import { neo } from '../db/neo4j';
import { redis } from '../subscriptions/pubsub';
import { trace, Span } from '@opentelemetry/api';
import { Counter, Histogram } from 'prom-client';
import crypto from 'crypto';

const tracer = trace.getTracer('deduplication', '24.2.0');

// Metrics
const dedupeChecks = new Counter({
  name: 'dedupe_checks_total',
  help: 'Total deduplication checks performed',
  labelNames: ['tenant_id', 'result'],
});

const dedupeLatency = new Histogram({
  name: 'dedupe_check_duration_seconds',
  help: 'Time spent on deduplication checks',
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1.0],
  labelNames: ['method'],
});

const duplicateRate = new Counter({
  name: 'ingest_duplicates_total',
  help: 'Total duplicate signals detected',
  labelNames: ['tenant_id', 'type', 'method'],
});

interface DedupeKey {
  tenantId: string;
  type: string;
  value: number;
  timestamp: string;
  source?: string;
}

export class DeduplicationService {
  private readonly redisKeyPrefix = 'dedupe';
  private readonly redisTTL = 3600; // 1 hour
  private readonly postgresWindow = 300; // 5 minutes for PG check

  async checkDuplicate(signal: DedupeKey): Promise<boolean> {
    return tracer.startActiveSpan('dedupe.check', async (span: Span) => {
      span.setAttributes({
        tenant_id: signal.tenantId,
        signal_type: signal.type,
      });

      try {
        // Generate deduplication hash
        const dedupeHash = this.generateDedupeHash(signal);

        // Fast path: Redis bloom filter / set check
        const isRedisCache = await this.checkRedisCache(
          dedupeHash,
          signal.tenantId,
        );
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
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: 2, message: (error as Error).message });

        dedupeChecks.inc({ tenant_id: signal.tenantId, result: 'error' });
        console.error('Deduplication check failed:', error);

        // Fail open - allow processing if deduplication fails
        return false;
      } finally {
        span.end();
      }
    });
  }

  private generateDedupeHash(signal: DedupeKey): string {
    // Create hash based on key fields that define uniqueness
    const keyString = [
      signal.tenantId,
      signal.type,
      signal.value.toString(),
      this.normalizeTimestamp(signal.timestamp),
      signal.source || '',
    ].join('|');

    return crypto.createHash('sha256').update(keyString).digest('hex');
  }

  private normalizeTimestamp(timestamp: string): string {
    // Round timestamp to nearest minute to handle slight timing differences
    const date = new Date(timestamp);
    date.setSeconds(0, 0); // Zero out seconds and milliseconds
    return date.toISOString();
  }

  private async checkRedisCache(
    dedupeHash: string,
    tenantId: string,
  ): Promise<boolean> {
    const startTime = Date.now();

    try {
      const key = `${this.redisKeyPrefix}:${tenantId}:${dedupeHash}`;
      const exists = await redis.get(key);

      dedupeLatency.observe(
        { method: 'redis' },
        (Date.now() - startTime) / 1000,
      );

      return exists !== null;
    } catch (error) {
      console.error('Redis dedupe check failed:', error);
      return false; // Fail open
    }
  }

  private async cacheDedupeHash(
    dedupeHash: string,
    tenantId: string,
  ): Promise<void> {
    try {
      const key = `${this.redisKeyPrefix}:${tenantId}:${dedupeHash}`;
      await redis.setWithTTL(key, '1', this.redisTTL);
    } catch (error) {
      console.error('Failed to cache dedupe hash:', error);
      // Non-critical error, continue processing
    }
  }

  private async checkDatabaseDuplicate(
    signal: DedupeKey,
    dedupeHash: string,
  ): Promise<boolean> {
    const startTime = Date.now();

    try {
      // Check PostgreSQL for recent coherence score updates
      const pgResult = await this.checkPostgresDuplicate(signal);

      // Check Neo4j for recent signal nodes
      const neoResult = await this.checkNeo4jDuplicate(signal, dedupeHash);

      dedupeLatency.observe(
        { method: 'database' },
        (Date.now() - startTime) / 1000,
      );

      return pgResult || neoResult;
    } catch (error) {
      console.error('Database dedupe check failed:', error);
      return false; // Fail open
    }
  }

  private async checkPostgresDuplicate(signal: DedupeKey): Promise<boolean> {
    // Check for recent updates with similar characteristics
    const windowStart = new Date(Date.now() - this.postgresWindow * 1000);

    const result = await pg.oneOrNone(
      `
      SELECT 1 FROM coherence_scores 
      WHERE tenant_id = $1 
        AND updated_at >= $2 
        AND abs(score - $3) < 0.001
      LIMIT 1
    `,
      [signal.tenantId, windowStart, signal.value],
    );

    return result !== null;
  }

  private async checkNeo4jDuplicate(
    signal: DedupeKey,
    dedupeHash: string,
  ): Promise<boolean> {
    // Check for signal nodes with exact match
    const result = await neo.run(
      `
      MATCH (s:Signal) 
      WHERE s.tenant_id = $tenantId
        AND s.id = $dedupeHash
      RETURN s.id LIMIT 1
    `,
      {
        tenantId: signal.tenantId,
        dedupeHash,
      },
    );

    return result.records.length > 0;
  }

  async batchCheckDuplicates(signals: DedupeKey[]): Promise<boolean[]> {
    return tracer.startActiveSpan('dedupe.batch_check', async (span: Span) => {
      span.setAttributes({
        batch_size: signals.length,
      });

      try {
        // Process in parallel for better performance
        const promises = signals.map((signal) => this.checkDuplicate(signal));
        return await Promise.all(promises);
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: 2, message: (error as Error).message });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  async initializeDatabaseIndexes(): Promise<void> {
    console.log('Initializing deduplication database indexes...');

    try {
      // PostgreSQL indexes for coherence_scores deduplication
      await pg.oneOrNone(`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_coherence_scores_dedupe 
        ON coherence_scores (tenant_id, updated_at DESC, score);
      `);

      console.log('PostgreSQL deduplication indexes created');

      // Neo4j indexes for signal deduplication
      await neo.run(`
        CREATE INDEX signal_dedupe_index IF NOT EXISTS 
        FOR (s:Signal) ON (s.tenant_id, s.id);
      `);

      console.log('Neo4j deduplication indexes created');
    } catch (error) {
      console.error('Failed to create deduplication indexes:', error);
      throw error;
    }
  }

  getDeduplicationStats(): Record<string, any> {
    // Return current deduplication metrics
    return {
      redisKeyPrefix: this.redisKeyPrefix,
      redisTTL: this.redisTTL,
      postgresWindow: this.postgresWindow,
      timestamp: new Date().toISOString(),
    };
  }
}

export const deduplicationService = new DeduplicationService();
