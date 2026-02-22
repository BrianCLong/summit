// @ts-nocheck
import express from 'express';
import { trace } from '@opentelemetry/api';
import {
  revokeSession,
  signSession,
  verifySessionToken,
  isRevoked,
} from './sessions.js';
import { mcpSessionsTotal } from '../../monitoring/metrics.js';
import { persistSession, revokeSessionPersist } from './sessions-store.js';
import { capabilityFirewall } from '../../capability-fabric/firewall.js';

// In-memory session registry for UI/status listing
type ActiveSession = {
  sid: string;
  runId: string;
  scopes: string[];
  servers?: string[];
  createdAt: number;
};
const sessionsByRun = new Map<string, ActiveSession[]>();

const router = express.Router({ mergeParams: true });
router.use(express.json());

// POST /api/maestro/v1/runs/:id/mcp/sessions
router.post('/runs/:id/mcp/sessions', async (req, res) => {
  const tracer = trace.getTracer('maestro-mcp');
  tracer.startActiveSpan('mcp.session.create', async (span: any) => {
    const runId = req.params.id;
    const { scopes, servers } = req.body || {};
    if (!Array.isArray(scopes) || scopes.length === 0) {
      span.setAttribute('error', true);
      span.end();
      return res
        .status(400)
        .json({ error: 'scopes is required (non-empty array)' });
    }
    try {
      const actorScopes = String(req.headers['x-actor-scopes'] || '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);
      const approvalToken = req.headers['x-approval-token'] as string | undefined;
      const tenantId =
        (req.headers['x-tenant-id'] as string | undefined) || 'system';
      const userId = (req as any).user?.id || 'unknown';
      const pathValue = '/api/maestro/v1/runs/:id/mcp/sessions';
      const preflight = await capabilityFirewall.preflightHttpEndpoint(
        req.method,
        pathValue,
        { scopes, servers },
        actorScopes,
        approvalToken,
        tenantId,
        userId,
      );
      capabilityFirewall.logDecision(preflight.decision, preflight.inputHash);
    } catch (err: any) {
      span.setAttribute('error', true);
      span.end();
      const status =
        err?.message === 'rate_limited'
          ? 429
          : err?.message?.includes('schema')
            ? 400
            : 403;
      return res.status(status).json({
        error: 'capability_blocked',
        message: err?.message || 'capability_blocked',
      });
    }

    const { sid, token } = signSession({ runId, scopes, servers });
    const list = sessionsByRun.get(runId) || [];
    list.push({ sid, runId, scopes, servers, createdAt: Date.now() });
    sessionsByRun.set(runId, list);
    if (process.env.MCP_SESSIONS_PERSIST === 'true') {
      const payload = JSON.parse(
        Buffer.from(token.split('.')[0], 'base64url').toString('utf8'),
      );
      persistSession(sid, runId, scopes, servers, payload.exp).catch(() => {});
    }
    try {
      mcpSessionsTotal.inc({ event: 'created' });
    } catch {}
    span.setAttribute('run.id', runId);
    span.setAttribute('session.sid', sid);
    span.end();
    return res.status(201).json({ sid, token, runId, scopes, servers });
  });
});

// DELETE /api/maestro/v1/runs/:id/mcp/sessions/:sid
router.delete('/runs/:id/mcp/sessions/:sid', (req, res) => {
  const tracer = trace.getTracer('maestro-mcp');
  tracer.startActiveSpan('mcp.session.revoke', (span: any) => {
    revokeSession(req.params.sid);
    const runId = req.params.id;
    const before = sessionsByRun.get(runId) || [];
    sessionsByRun.set(
      runId,
      before.filter((s) => s.sid !== req.params.sid),
    );
    if (process.env.MCP_SESSIONS_PERSIST === 'true') {
      revokeSessionPersist(req.params.sid).catch(() => {});
    }
    try {
      mcpSessionsTotal.inc({ event: 'revoked' });
    } catch {}
    span.setAttribute('run.id', runId);
    span.setAttribute('session.sid', req.params.sid);
    span.end();
    return res.status(204).send();
  });
});

// GET active sessions for a run (UI)
router.get('/runs/:id/mcp/sessions', (req, res) => {
  const runId = req.params.id;
  const list = (sessionsByRun.get(runId) || []).filter(
    (s) => !isRevoked(s.sid),
  );
  return res.json(
    list.map(({ sid, scopes, servers, createdAt }) => ({
      sid,
      scopes,
      servers,
      createdAt,
    })),
  );
});

// Middleware to verify session token and scopes
export function requireScope(scope: string) {
  return (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    const auth = req.headers['authorization'] || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : undefined;
    const sess = verifySessionToken(token);
    if (!sess || isRevoked(sess.sid)) {
      return res.status(401).json({ error: 'invalid session token' });
    }
    if (!sess.scopes.includes(scope) && !sess.scopes.includes('*')) {
      return res
        .status(403)
        .json({ error: 'missing required scope', required: scope });
    }
    (req as any).mcpSession = sess;
    next();
  };
}

export default router;
