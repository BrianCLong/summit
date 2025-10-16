import express from 'express';
import {
  linkTicketToRun,
  linkTicketToDeployment,
  getTicketLinks,
} from '../services/ticket-links.js';

const router = express.Router();

/** GET /api/tickets/:provider/:externalId/links */
router.get('/tickets/:provider/:externalId/links', async (req, res) => {
  const { provider, externalId } = req.params as any;
  const links = await getTicketLinks({ provider, externalId });
  res.json(links);
});

/** POST /api/tickets/:provider/:externalId/link-run { runId } */
router.post(
  '/tickets/:provider/:externalId/link-run',
  express.json(),
  async (req, res) => {
    const { provider, externalId } = req.params as any;
    const { runId } = (req.body || {}) as any;
    if (!runId) return res.status(400).json({ error: 'runId required' });
    await linkTicketToRun({ provider, externalId, runId });
    res.json({ ok: true });
  },
);

/** POST /api/tickets/:provider/:externalId/link-deployment { deploymentId } */
router.post(
  '/tickets/:provider/:externalId/link-deployment',
  express.json(),
  async (req, res) => {
    const { provider, externalId } = req.params as any;
    const { deploymentId } = (req.body || {}) as any;
    if (!deploymentId)
      return res.status(400).json({ error: 'deploymentId required' });
    await linkTicketToDeployment({ provider, externalId, deploymentId });
    res.json({ ok: true });
  },
);

export default router;
