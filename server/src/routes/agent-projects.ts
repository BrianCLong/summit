import express from 'express';
import { AgentSessionExplorerService } from '../agent-session-explorer/service.js';
import { createDefaultAgentSessionExplorerService } from '../agent-session-explorer/defaultService.js';
import {
  ensureAgentSessionExplorerEnabled,
  requireAgentSessionAdmin,
  requireAgentSessionAuth,
} from './agent-session-explorer-middleware.js';

const defaultService = createDefaultAgentSessionExplorerService();

export function buildAgentProjectsRouter(
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
      const projects = await provider.getProjects();
      return res.json({ projects });
    },
  );

  return router;
}

export default buildAgentProjectsRouter();

