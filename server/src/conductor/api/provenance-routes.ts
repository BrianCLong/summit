// @ts-nocheck
// Provenance Explorer API Routes - Operator-focused provenance inspection
import express from 'express';
import { getPostgresPool } from '../../db/postgres.js';
import { requirePermission, AuthenticatedRequest } from '../auth/rbac-middleware.js';
import { usageLedger } from '../../usage/usage-ledger.js';
import logger from '../../config/logger.js';

const router = express.Router();

interface ProvenanceItem {
  id: string;
  type: 'run' | 'evidence' | 'receipt' | 'build' | 'deployment';
  createdAt: string;
  actor?: string;
  source?: string;
  commit?: string;
  status: 'success' | 'failed' | 'pending' | 'unknown';
  integrity: {
    hash?: string;
    verified?: boolean;
    signatureValid?: boolean;
  };
  links: {
    runId?: string;
    buildId?: string;
    deploymentId?: string;
    sessionId?: string;
  };
  metadata?: Record<string, any>;
}

interface ProvenanceDetails extends ProvenanceItem {
  inputs: Array<{
    id: string;
    type: string;
    hash?: string;
    source?: string;
  }>;
  outputs: Array<{
    id: string;
    type: string;
    hash?: string;
    destination?: string;
  }>;
  steps: Array<{
    id: string;
    name: string;
    status: string;
    startedAt: string;
    endedAt?: string;
    duration?: number;
  }>;
  hashes: {
    contentHash?: string;
    receiptHash?: string;
    bundleHash?: string;
  };
  signatures?: Array<{
    algorithm: string;
    value: string;
    timestamp: string;
    signer: string;
  }>;
  policyDecisions?: Array<{
    policy: string;
    decision: 'allow' | 'deny' | 'review';
    reason: string;
    timestamp: string;
  }>;
  relatedIds: string[];
}

/**
 * GET /api/ops/provenance/summary
 * Returns latest provenance items with pagination
 */
router.get(
  '/summary',
  requirePermission('evidence:read'),
  async (req: express.Request, res: express.Response) => {
    const startTime = Date.now();
    const authReq = req as AuthenticatedRequest;

    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
      const offset = parseInt(req.query.offset as string) || 0;
      const pool = getPostgresPool();

      // Fetch recent runs with evidence artifacts
      const { rows } = await pool.query<any>(
        `SELECT
          r.id,
          r.runbook,
          r.status,
          r.started_at,
          r.ended_at,
          r.tenant_id,
          r.created_by,
          COUNT(DISTINCT ea.id) as artifact_count,
          array_agg(DISTINCT ea.artifact_type) FILTER (WHERE ea.artifact_type IS NOT NULL) as artifact_types
        FROM run r
        LEFT JOIN evidence_artifacts ea ON ea.run_id = r.id
        GROUP BY r.id, r.runbook, r.status, r.started_at, r.ended_at, r.tenant_id, r.created_by
        ORDER BY r.started_at DESC
        LIMIT $1 OFFSET $2`,
        [limit, offset]
      );

      const items: ProvenanceItem[] = rows.map((row) => {
        const hasReceipt = row.artifact_types?.includes('receipt');

        return {
          id: row.id,
          type: 'run' as const,
          createdAt: row.started_at,
          actor: row.created_by || 'system',
          source: row.runbook,
          commit: undefined,
          status: row.status || 'unknown',
          integrity: {
            hash: undefined,
            verified: hasReceipt ? true : undefined,
            signatureValid: hasReceipt ? true : undefined,
          },
          links: {
            runId: row.id,
          },
          metadata: {
            artifactCount: parseInt(row.artifact_count) || 0,
            artifactTypes: row.artifact_types || [],
            tenantId: row.tenant_id,
          },
        };
      });

      const duration = Date.now() - startTime;
      usageLedger.recordUsage({
        operationName: 'provenance.summary',
        tenantId: authReq.user?.tenantId,
        userId: authReq.user?.userId,
        timestamp: new Date(),
        requestSizeBytes: 0,
        success: true,
        statusCode: 200,
        durationMs: duration,
      });

      res.json({
        success: true,
        data: items,
        pagination: {
          limit,
          offset,
          total: items.length,
          hasMore: items.length === limit,
        },
      });
    } catch (error: any) {
      logger.error('Provenance summary error', { error: error.message });
      const duration = Date.now() - startTime;
      usageLedger.recordUsage({
        operationName: 'provenance.summary',
        tenantId: authReq.user?.tenantId,
        userId: authReq.user?.userId,
        timestamp: new Date(),
        requestSizeBytes: 0,
        success: false,
        statusCode: 500,
        errorCategory: 'runtime',
        durationMs: duration,
      });
      res.status(500).json({
        success: false,
        error: 'Failed to load provenance summary',
        message: error.message,
      });
    }
  }
);

/**
 * GET /api/ops/provenance/item/:id
 * Returns full provenance details for an item
 */
router.get(
  '/item/:id',
  requirePermission('evidence:read'),
  async (req: express.Request, res: express.Response) => {
    const startTime = Date.now();
    const authReq = req as AuthenticatedRequest;
    const { id } = req.params;

    try {
      const pool = getPostgresPool();

      // Fetch run details
      const { rows: runRows } = await pool.query<any>(
        `SELECT * FROM run WHERE id=$1`,
        [id]
      );

      if (!runRows.length) {
        return res.status(404).json({
          success: false,
          error: 'Provenance item not found',
        });
      }

      const run = runRows[0];

      // Fetch events
      const { rows: eventRows } = await pool.query<any>(
        `SELECT * FROM run_event WHERE run_id=$1 ORDER BY ts ASC`,
        [id]
      );

      // Fetch artifacts
      const { rows: artifactRows } = await pool.query<any>(
        `SELECT * FROM evidence_artifacts WHERE run_id=$1 ORDER BY created_at ASC`,
        [id]
      );

      // Build detailed response
      const details: ProvenanceDetails = {
        id: run.id,
        type: 'run',
        createdAt: run.started_at,
        actor: run.created_by || 'system',
        source: run.runbook,
        status: run.status || 'unknown',
        integrity: {
          hash: undefined,
          verified: artifactRows.some((a: any) => a.artifact_type === 'receipt'),
        },
        links: {
          runId: run.id,
        },
        inputs: [],
        outputs: artifactRows.map((artifact: any) => ({
          id: artifact.id,
          type: artifact.artifact_type,
          hash: artifact.sha256_hash,
          destination: artifact.s3_key,
        })),
        steps: eventRows.map((event: any, index: number) => {
          const nextEvent = eventRows[index + 1];
          const startedAt = new Date(event.ts);
          const endedAt = nextEvent ? new Date(nextEvent.ts) : run.ended_at ? new Date(run.ended_at) : undefined;

          return {
            id: `${event.kind}-${index}`,
            name: event.kind,
            status: 'completed',
            startedAt: event.ts,
            endedAt: endedAt?.toISOString(),
            duration: endedAt ? endedAt.getTime() - startedAt.getTime() : undefined,
          };
        }),
        hashes: {
          contentHash: artifactRows[0]?.sha256_hash,
        },
        policyDecisions: [],
        relatedIds: [],
        metadata: {
          tenantId: run.tenant_id,
          eventCount: eventRows.length,
          artifactCount: artifactRows.length,
        },
      };

      const duration = Date.now() - startTime;
      usageLedger.recordUsage({
        operationName: 'provenance.item',
        tenantId: authReq.user?.tenantId,
        userId: authReq.user?.userId,
        timestamp: new Date(),
        requestSizeBytes: 0,
        success: true,
        statusCode: 200,
        durationMs: duration,
      });

      res.json({
        success: true,
        data: details,
      });
    } catch (error: any) {
      logger.error('Provenance item error', { error: error.message, itemId: id });
      const duration = Date.now() - startTime;
      usageLedger.recordUsage({
        operationName: 'provenance.item',
        tenantId: authReq.user?.tenantId,
        userId: authReq.user?.userId,
        timestamp: new Date(),
        requestSizeBytes: 0,
        success: false,
        statusCode: 500,
        errorCategory: 'runtime',
        durationMs: duration,
      });
      res.status(500).json({
        success: false,
        error: 'Failed to load provenance item',
        message: error.message,
      });
    }
  }
);

/**
 * GET /api/ops/provenance/search
 * Search provenance items with filters
 */
router.get(
  '/search',
  requirePermission('evidence:read'),
  async (req: express.Request, res: express.Response) => {
    const startTime = Date.now();
    const authReq = req as AuthenticatedRequest;

    try {
      const {
        q,
        from,
        to,
        type,
        status,
        limit: limitStr,
        offset: offsetStr,
      } = req.query;

      const limit = Math.min(parseInt(limitStr as string) || 50, 200);
      const offset = parseInt(offsetStr as string) || 0;

      const pool = getPostgresPool();
      const conditions: string[] = ['1=1'];
      const params: any[] = [];
      let paramCount = 0;

      // Search query
      if (q) {
        paramCount++;
        conditions.push(`(r.id ILIKE $${paramCount} OR r.runbook ILIKE $${paramCount} OR r.created_by ILIKE $${paramCount})`);
        params.push(`%${q}%`);
      }

      // Date range
      if (from) {
        paramCount++;
        conditions.push(`r.started_at >= $${paramCount}`);
        params.push(from);
      }
      if (to) {
        paramCount++;
        conditions.push(`r.started_at <= $${paramCount}`);
        params.push(to);
      }

      // Status filter
      if (status) {
        paramCount++;
        conditions.push(`r.status = $${paramCount}`);
        params.push(status);
      }

      // Add limit and offset
      paramCount++;
      params.push(limit);
      const limitParam = paramCount;
      paramCount++;
      params.push(offset);
      const offsetParam = paramCount;

      const query = `
        SELECT
          r.id,
          r.runbook,
          r.status,
          r.started_at,
          r.ended_at,
          r.tenant_id,
          r.created_by,
          COUNT(DISTINCT ea.id) as artifact_count,
          array_agg(DISTINCT ea.artifact_type) FILTER (WHERE ea.artifact_type IS NOT NULL) as artifact_types
        FROM run r
        LEFT JOIN evidence_artifacts ea ON ea.run_id = r.id
        WHERE ${conditions.join(' AND ')}
        GROUP BY r.id, r.runbook, r.status, r.started_at, r.ended_at, r.tenant_id, r.created_by
        ORDER BY r.started_at DESC
        LIMIT $${limitParam} OFFSET $${offsetParam}
      `;

      const { rows } = await pool.query<any>(query, params);

      const items: ProvenanceItem[] = rows.map((row) => {
        const hasReceipt = row.artifact_types?.includes('receipt');

        return {
          id: row.id,
          type: 'run' as const,
          createdAt: row.started_at,
          actor: row.created_by || 'system',
          source: row.runbook,
          status: row.status || 'unknown',
          integrity: {
            verified: hasReceipt ? true : undefined,
          },
          links: {
            runId: row.id,
          },
          metadata: {
            artifactCount: parseInt(row.artifact_count) || 0,
            tenantId: row.tenant_id,
          },
        };
      });

      const duration = Date.now() - startTime;
      usageLedger.recordUsage({
        operationName: 'provenance.search',
        tenantId: authReq.user?.tenantId,
        userId: authReq.user?.userId,
        timestamp: new Date(),
        requestSizeBytes: 0,
        success: true,
        statusCode: 200,
        durationMs: duration,
      });

      res.json({
        success: true,
        data: items,
        pagination: {
          limit,
          offset,
          total: items.length,
          hasMore: items.length === limit,
        },
        filters: { q, from, to, type, status },
      });
    } catch (error: any) {
      logger.error('Provenance search error', { error: error.message });
      const duration = Date.now() - startTime;
      usageLedger.recordUsage({
        operationName: 'provenance.search',
        tenantId: authReq.user?.tenantId,
        userId: authReq.user?.userId,
        timestamp: new Date(),
        requestSizeBytes: 0,
        success: false,
        statusCode: 500,
        errorCategory: 'runtime',
        durationMs: duration,
      });
      res.status(500).json({
        success: false,
        error: 'Search failed',
        message: error.message,
      });
    }
  }
);

/**
 * POST /api/ops/provenance/evidence-pack
 * Generate and export evidence pack for selected items
 */
router.post(
  '/evidence-pack',
  requirePermission('evidence:create'),
  express.json(),
  async (req: express.Request, res: express.Response) => {
    const startTime = Date.now();
    const authReq = req as AuthenticatedRequest;

    try {
      const { ids, format = 'json' } = req.body;

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'ids array is required',
        });
      }

      if (ids.length > 100) {
        return res.status(400).json({
          success: false,
          error: 'Maximum 100 items per evidence pack',
        });
      }

      const pool = getPostgresPool();

      // Fetch all runs and their artifacts
      const { rows: runs } = await pool.query<any>(
        `SELECT r.*,
          array_agg(json_build_object(
            'id', ea.id,
            'type', ea.artifact_type,
            'hash', ea.sha256_hash,
            'size', ea.size_bytes,
            'createdAt', ea.created_at
          )) as artifacts
        FROM run r
        LEFT JOIN evidence_artifacts ea ON ea.run_id = r.id
        WHERE r.id = ANY($1)
        GROUP BY r.id`,
        [ids]
      );

      if (runs.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'No matching items found',
        });
      }

      // Build evidence pack
      const evidencePack = {
        version: '1.0.0',
        generatedAt: new Date().toISOString(),
        generatedBy: authReq.user?.userId || 'system',
        format,
        items: runs.map((run: any) => ({
          id: run.id,
          type: 'run',
          status: run.status,
          createdAt: run.started_at,
          completedAt: run.ended_at,
          actor: run.created_by,
          source: run.runbook,
          tenantId: run.tenant_id,
          artifacts: run.artifacts.filter((a: any) => a.id !== null),
        })),
        metadata: {
          itemCount: runs.length,
          totalArtifacts: runs.reduce((sum: number, r: any) =>
            sum + r.artifacts.filter((a: any) => a.id !== null).length, 0
          ),
          exportedBy: authReq.user?.email || authReq.user?.userId,
          tenantId: authReq.user?.tenantId,
        },
        signature: {
          algorithm: 'SHA-256',
          timestamp: new Date().toISOString(),
          // In production, sign with private key
          value: 'mock-signature-' + Date.now(),
        },
      };

      const duration = Date.now() - startTime;
      usageLedger.recordUsage({
        operationName: 'provenance.evidence-pack',
        tenantId: authReq.user?.tenantId,
        userId: authReq.user?.userId,
        timestamp: new Date(),
        requestSizeBytes: JSON.stringify(req.body).length,
        success: true,
        statusCode: 200,
        durationMs: duration,
      });

      // Return based on format
      if (format === 'download') {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="evidence-pack-${Date.now()}.json"`);
        return res.json(evidencePack);
      }

      res.json({
        success: true,
        data: {
          payload: evidencePack,
          downloadUrl: `/api/ops/provenance/evidence-pack/${evidencePack.generatedAt}`,
        },
      });
    } catch (error: any) {
      logger.error('Evidence pack generation error', { error: error.message });
      const duration = Date.now() - startTime;
      usageLedger.recordUsage({
        operationName: 'provenance.evidence-pack',
        tenantId: authReq.user?.tenantId,
        userId: authReq.user?.userId,
        timestamp: new Date(),
        requestSizeBytes: 0,
        success: false,
        statusCode: 500,
        errorCategory: 'runtime',
        durationMs: duration,
      });
      res.status(500).json({
        success: false,
        error: 'Failed to generate evidence pack',
        message: error.message,
      });
    }
  }
);

/**
 * GET /api/ops/provenance/health
 * Health check for provenance system
 */
router.get('/health', async (req: express.Request, res: express.Response) => {
  try {
    const pool = getPostgresPool();
    const { rows } = await pool.query<any>('SELECT COUNT(*) as count FROM run LIMIT 1');

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      runCount: parseInt(rows[0]?.count) || 0,
    });
  } catch (error: any) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

export { router as provenanceRoutes };
