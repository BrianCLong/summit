// @ts-nocheck
import express from 'express';
import { trace } from '@opentelemetry/api';
import { requireScope } from './sessions-api.js';
import { getPostgresPool } from '../../config/database.js';
import { mcpClient, initializeMCPClient } from '../../conductor/mcp/client.js';
import { mcpInvocationsTotal } from '../../monitoring/metrics.js';
import { capabilityFirewall } from '../../capability-fabric/firewall.js';

const router = express.Router({ mergeParams: true });
router.use(express.json());

// POST /api/maestro/v1/runs/:id/mcp/invoke
router.post(
  '/runs/:id/mcp/invoke',
  requireScope('mcp:invoke'),
  async (req, res) => {
    const tracer = trace.getTracer('maestro-mcp');
    return tracer.startActiveSpan('mcp.invoke', async (span: any) => {
      const { server, tool, args } = req.body || {};
      if (!server || !tool) {
        span.setAttribute('error', true);
        span.end();
        return res.status(400).json({ error: 'server and tool are required' });
      }
      try {
        const sess = (req as any).mcpSession;
        const approvalToken = req.headers['x-approval-token'] as string | undefined;
        const tenantId =
          (req.headers['x-tenant-id'] as string | undefined) || 'system';
        const userId = (req as any).user?.id || 'unknown';
        const preflight = await capabilityFirewall.preflightMcpInvoke(
          server,
          tool,
          args || {},
          sess?.scopes ?? [],
          approvalToken,
          tenantId,
          userId,
        );

        // Lazy init client with current registry
        if (!mcpClient) initializeMCPClient({ timeout: 5000 });
        const result = await mcpClient.executeTool(
          server,
          tool,
          preflight.sanitizedArgs,
          sess?.scopes,
        );
        const postflight = capabilityFirewall.postflightMcpInvoke(
          preflight.capability,
          server,
          tool,
          result || {},
        );
        capabilityFirewall.logDecision(
          preflight.decision,
          preflight.inputHash,
          postflight.outputHash,
        );

        // Audit log (best effort; do not fail invoke on audit failure)
        const argsHash = preflight.inputHash;
        const resultHash = postflight.outputHash;
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
              {
                server,
                tool,
                argsHash,
                resultHash,
                capability_id: preflight.capability.capability_id,
              },
            ] as any,
          );
        } catch (e: any) {
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
        res.json({
          server,
          tool,
          result: postflight.sanitizedResult,
          capability_id: preflight.capability.capability_id,
          audit: { argsHash, resultHash },
        });
      } catch (err: any) {
        if (
          [
            'capability_unregistered',
            'identity_not_allowed',
            'approval_required',
            'rate_limited',
            'input_schema_invalid',
            'output_schema_invalid',
          ].includes(err?.message)
        ) {
          try {
            mcpInvocationsTotal.inc({ status: 'error' });
          } catch {}
          span.setAttribute('error', true);
          span.end();
          const status =
            err.message === 'rate_limited'
              ? 429
              : err.message.includes('schema')
                ? 400
                : 403;
          return res.status(status).json({
            error: 'capability_blocked',
            message: err.message,
          });
        }
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
        res.status(500).json({
          error: 'invoke_failed',
          message: err?.message || 'Unknown error',
        });
      }
    });
  },
);

export default router;
