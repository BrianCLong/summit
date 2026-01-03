import express, { Request, Response, NextFunction } from 'express';
import path from 'node:path';
import os from 'node:os';
import { AgentSessionExplorerService } from '../agent-session-explorer/service.js';
import { ClaudeCodeHistoryProvider } from '../agent-session-explorer/providers/claudeCodeHistoryProvider.js';
import { cfg } from '../config.js';
import { productionAuthMiddleware } from '../config/production-security.js';
import { logger } from '../config/logger.js';

const defaultService = new AgentSessionExplorerService({
  claude: new ClaudeCodeHistoryProvider({
    rootPath: process.env.SUMMIT_AGENT_HISTORY_ROOT || path.join(os.homedir(), '.claude'),
  }),
});

const ensureFeatureEnabled = (
  _req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (!cfg.AGENT_SESSION_EXPLORER_ENABLED) {
    return res.status(404).json({ error: 'Agent session explorer is disabled' });
  }
  return next();
};

const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  if (cfg.NODE_ENV === 'production') {
    return productionAuthMiddleware(req, res, next);
  }

  if ((req as any).user) return next();
  if (process.env.ENABLE_INSECURE_DEV_AUTH === 'true') {
    (req as any).user = { sub: 'dev-user', role: 'admin' };
    return next();
  }

  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  // Best-effort token presence check; full verification is handled in production middleware
  (req as any).user = { sub: 'token-user', role: 'admin', token };
  return next();
};

const requireAdminIfPresent = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const role = (req as any).user?.role;
  if (role && !['admin', 'superadmin', 'owner'].includes(role)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  return next();
};

export function buildAgentSessionsRouter(
  service: AgentSessionExplorerService = defaultService,
) {
  const router = express.Router();

  router.get('/', ensureFeatureEnabled, requireAuth, requireAdminIfPresent, async (req, res) => {
    const providerName = String(req.query.provider || 'claude');
    const provider = service.getProvider(providerName);
    if (!provider) return res.status(404).json({ error: 'Provider not found' });

    const { project, q, limit, cursor } = req.query;
    const numericLimit = limit ? Number(limit) : undefined;
    const result = await provider.listSessions({
      project: project ? String(project) : undefined,
      q: q ? String(q) : undefined,
      limit: numericLimit,
      cursor: cursor ? String(cursor) : undefined,
    });

    return res.json(result);
  });

  router.get(
    '/:provider/:sessionId',
    ensureFeatureEnabled,
    requireAuth,
    requireAdminIfPresent,
    async (req, res) => {
      const provider = service.getProvider(req.params.provider);
      if (!provider) return res.status(404).json({ error: 'Provider not found' });
      const detail = await provider.getSessionDetail(req.params.sessionId);
      if (!detail) return res.status(404).json({ error: 'Session not found' });
      return res.json(detail);
    },
  );

  router.get(
    '/:provider/:sessionId/stream',
    ensureFeatureEnabled,
    requireAuth,
    requireAdminIfPresent,
    async (req, res) => {
      const provider = service.getProvider(req.params.provider);
      if (!provider) return res.status(404).json({ error: 'Provider not found' });

      const detail = await provider.getSessionDetail(req.params.sessionId);
      if (!detail) return res.status(404).json({ error: 'Session not found' });

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders?.();

      const send = (event: string, data: unknown) => {
        res.write(`event: ${event}\n`);
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      };

      send('session.reloaded', detail);

      const watcher = provider.watchSession(req.params.sessionId, async () => {
        try {
          const updated = await provider.getSessionDetail(req.params.sessionId);
          if (!updated) return;
          send('session.reloaded', updated);
        } catch (error: any) {
          logger.error({ err: error }, 'Failed to stream updated session');
        }
      });

      const keepAlive = setInterval(() => {
        res.write(': keep-alive\n\n');
      }, 20000);

      req.on('close', () => {
        clearInterval(keepAlive);
        watcher?.close();
      });
    },
  );

  router.get(
    '/projects/list',
    ensureFeatureEnabled,
    requireAuth,
    requireAdminIfPresent,
    async (req, res) => {
      const providerName = String(req.query.provider || 'claude');
      const provider = service.getProvider(providerName);
      if (!provider) return res.status(404).json({ error: 'Provider not found' });
      const projects = await provider.getProjects();
      return res.json({ projects });
    },
  );

  return router;
}

export default buildAgentSessionsRouter();
