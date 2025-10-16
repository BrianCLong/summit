import express from 'express';
import crypto from 'crypto';
import { trace } from '@opentelemetry/api';
import { requireScope } from './sessions-api.js';
import { getPostgresPool } from '../../config/database.js';
import {
  mcpRegistry,
  mcpClient,
  initializeMCPClient,
} from '../../conductor/mcp/client.js';
import { mcpInvocationsTotal } from '../../monitoring/metrics.js';

const router = express.Router({ mergeParams: true });
router.use(express.json());

// POST /api/maestro/v1/runs/:id/mcp/invoke
router.post(
  '/runs/:id/mcp/invoke',
  requireScope('mcp:invoke'),
  async (req, res) => {
    const tracer = trace.getTracer('maestro-mcp');
    return tracer.startActiveSpan('mcp.invoke', async (span) => {
      const { server, tool, args } = req.body || {};
      if (!server || !tool) {
        span.setAttribute('error', true);
        span.end();
        return res.status(400).json({ error: 'server and tool are required' });
      }
      try {
        // Lazy init client with current registry
        if (!mcpClient) initializeMCPClient({ timeout: 5000 });
        const sess = (req as any).mcpSession;
        const result = await mcpClient.executeTool(
          server,
          tool,
          args || {},
          sess?.scopes,
        );

        // Audit log (best effort; do not fail invoke on audit failure)
        const argsHash = sha256Hex(JSON.stringify(args || {}));
        const resultHash = sha256Hex(JSON.stringify(result || {}));
        try {
          const pool = getPostgresPool();
          await pool.query(
            `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details)
         VALUES ($1, $2, $3, $4, $5)`,
            [
              null,
              'mcp_invoke',
              'mcp',
              req.params.id,
              { server, tool, argsHash, resultHash },
            ] as any,
          );
        } catch (e) {
          console.warn(
            'Audit log insert failed (non-fatal):',
            (e as any)?.message || e,
          );
        }

        try {
          mcpInvocationsTotal.inc({ status: 'success' });
        } catch {}
        span.setAttribute('run.id', req.params.id);
        span.setAttribute('mcp.server', server);
        span.setAttribute('mcp.tool', tool);
        span.end();
        res.json({ server, tool, result, audit: { argsHash, resultHash } });
      } catch (err: any) {
        if (err?.message?.includes('Insufficient scopes')) {
          try {
            mcpInvocationsTotal.inc({ status: 'error' });
          } catch {}
          span.setAttribute('error', true);
          span.end();
          return res
            .status(403)
            .json({ error: 'forbidden', message: err.message });
        }
        console.error('Invoke failed:', err);
        try {
          mcpInvocationsTotal.inc({ status: 'error' });
        } catch {}
        span.setAttribute('error', true);
        span.end();
        res
          .status(500)
          .json({
            error: 'invoke_failed',
            message: err?.message || 'Unknown error',
          });
      }
    });
  },
);

function sha256Hex(s: string): string {
  return crypto.createHash('sha256').update(s).digest('hex');
}

export default router;
