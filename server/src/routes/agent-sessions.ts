import express from 'express';
import { AgentSessionExplorerService } from '../agent-session-explorer/service.js';
import { createDefaultAgentSessionExplorerService } from '../agent-session-explorer/defaultService.js';
import { logger } from '../config/logger.js';
import {
  ensureAgentSessionExplorerEnabled,
  requireAgentSessionAdmin,
  requireAgentSessionAuth,
} from './agent-session-explorer-middleware.js';

const defaultService = createDefaultAgentSessionExplorerService();

export function buildAgentSessionsRouter(
  service: AgentSessionExplorerService = defaultService,
) {
  const router = express.Router();

  router.get(
    '/',
    ensureAgentSessionExplorerEnabled,
    requireAgentSessionAuth,
    requireAgentSessionAdmin,
    async (req, res) => {
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
    },
  );

  router.get(
    '/:provider/:sessionId',
    ensureAgentSessionExplorerEnabled,
    requireAgentSessionAuth,
    requireAgentSessionAdmin,
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
    ensureAgentSessionExplorerEnabled,
    requireAgentSessionAuth,
    requireAgentSessionAdmin,
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

  return router;
}

export default buildAgentSessionsRouter();
