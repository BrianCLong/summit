import { Request, Response } from 'express';
import { z } from 'zod';
import { Neo4jService } from '../db/neo4j';
import { RedisService } from '../cache/redis';
import logger from '../utils/logger';
import { randomUUID as uuidv4 } from 'crypto';

const CoherenceSignalSchema = z.object({
  tenantId: z.string().min(1),
  type: z.string().min(1),
  value: z.number(),
  weight: z.number().optional().default(1.0),
  source: z.string().min(1),
  ts: z
    .string()
    .datetime()
    .optional()
    .default(() => new Date().toISOString()),
  signalId: z.string().optional(),
});

export class CoherenceSignalIngest {
  constructor(
    private neo4j: Neo4jService,
    private redis: RedisService,
  ) {}

  async ingestSignal(req: Request, res: Response) {
    try {
      const validatedInput = CoherenceSignalSchema.parse(req.body);

      // Generate signal ID if not provided
      const signalId = validatedInput.signalId || uuidv4();

      // Generate deduplication key
      const dedupKey = `signal:${validatedInput.tenantId}:${validatedInput.source}:${signalId}:${validatedInput.ts}`;

      // Check if already processed
      const isProcessed = await this.redis.get(dedupKey);
      if (isProcessed) {
        logger.info('Duplicate signal ignored', { signalId, dedupKey });
        return res.status(200).json({ success: true, duplicate: true });
      }

      // Set deduplication flag with TTL
      await this.redis.setex(dedupKey, 3600, 'processed'); // 1 hour TTL

      // Attach provenance
      const provenanceId = uuidv4();
      const provenance = {
        id: provenanceId,
        purpose: 'benchmarking',
        retention: 'standard-365d',
        license: 'Restricted-TOS',
        residency: 'US',
        ingestedAt: new Date().toISOString(),
        source: req.ip || 'unknown',
      };

      // Store in Neo4j
      const session = this.neo4j.getSession();
      try {
        await session.executeWrite(async (tx) => {
          // Ensure tenant exists
          await tx.run(
            `
            MERGE (t:Tenant {tenant_id: $tenantId})
            SET t.last_signal_at = datetime()
          `,
            { tenantId: validatedInput.tenantId },
          );

          // Create signal
          await tx.run(
            `
            MATCH (t:Tenant {tenant_id: $tenantId})
            CREATE (s:Signal {
              signal_id: $signalId,
              type: $type,
              value: $value,
              weight: $weight,
              source: $source,
              ts: datetime($ts),
              provenance_id: $provenanceId,
              created_at: datetime()
            })
            CREATE (t)-[:EMITS]->(s)
          `,
            {
              tenantId: validatedInput.tenantId,
              signalId,
              type: validatedInput.type,
              value: validatedInput.value,
              weight: validatedInput.weight,
              source: validatedInput.source,
              ts: validatedInput.ts,
              provenanceId,
            },
          );
        });

        // Trigger materialization job (async)
        this.triggerMaterializationJob(validatedInput.tenantId).catch((err) =>
          logger.error('Materialization job failed', {
            err,
            tenantId: validatedInput.tenantId,
          }),
        );

        logger.info('Coherence signal ingested', {
          signalId,
          tenantId: validatedInput.tenantId,
          type: validatedInput.type,
          provenanceId,
        });

        res.status(201).json({
          success: true,
          signalId,
          provenanceId,
        });
      } finally {
        await session.close();
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.warn('Invalid signal schema', { errors: error.errors });
        return res.status(400).json({
          success: false,
          error: 'Invalid signal schema',
          details: error.errors,
        });
      }

      logger.error('Signal ingest failed', { error });
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  private async triggerMaterializationJob(tenantId: string) {
    // Simple in-process materialization for this increment
    // In production, this would trigger a background job
    const session = this.neo4j.getSession();
    try {
      const result = await session.executeRead(async (tx) => {
        return await tx.run(
          `
          MATCH (t:Tenant {tenant_id: $tenantId})-[:EMITS]->(s:Signal)
          WITH t, avg(s.value * s.weight) as weighted_avg, count(s) as signal_count
          RETURN weighted_avg, signal_count
        `,
          { tenantId },
        );
      });

      if (result.records.length > 0) {
        const record = result.records[0];
        const score = record.get('weighted_avg') || 0;
        const signalCount = record.get('signal_count') || 0;

        // Determine status based on signal count and score
        let status = 'low';
        if (signalCount >= 10) {
          if (score >= 0.8) status = 'high';
          else if (score >= 0.5) status = 'medium';
        }

        // Update materialized view in Postgres
        const { Pool } = require('pg');
        const pool = new Pool({
          connectionString: process.env.POSTGRES_URI,
        });

        await pool.query(
          `
          INSERT INTO coherence_scores (tenant_id, score, status, updated_at)
          VALUES ($1, $2, $3, NOW())
          ON CONFLICT (tenant_id)
          DO UPDATE SET 
            score = EXCLUDED.score,
            status = EXCLUDED.status,
            updated_at = EXCLUDED.updated_at
        `,
          [tenantId, score, status],
        );

        logger.info('Coherence score materialized', {
          tenantId,
          score,
          status,
          signalCount,
        });
      }
    } finally {
      await session.close();
    }
  }
}
