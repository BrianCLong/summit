import express from 'express';
import { MetaOrchestrator } from '../meta-orchestrator/MetaOrchestrator.js';
import { ensureAuthenticated } from '../middleware/auth.js';

const router = express.Router();
const orchestrator = MetaOrchestrator.getInstance();

// Middleware to ensure auth
router.use(ensureAuthenticated);

// Agents
router.get('/agents', (req, res) => {
  const tenantId = req.user?.tenant_id;
  const agents = orchestrator.getAgents(tenantId);
  res.json(agents);
});

router.post('/agents', (req, res) => {
  const agentData = req.body;
  const tenantId = req.user?.tenant_id;

  // Ensure tenantId matches
  if (!agentData.tenantId) {
      agentData.tenantId = tenantId;
  }

  if (agentData.tenantId !== tenantId) {
      return res.status(403).json({ error: 'Tenant mismatch' });
  }

  const agent = orchestrator.registerAgent(agentData);
  res.status(201).json(agent);
});

router.post('/agents/:id/heartbeat', (req, res) => {
    const { id } = req.params;
    const metrics = req.body; // { cpu, memory, activeTasks }
    orchestrator.healthMonitor.reportHeartbeat(id, metrics);
    res.sendStatus(200);
});

// Negotiations
router.get('/negotiations', (req, res) => {
    const tenantId = req.user?.tenant_id;
    const negotiations = orchestrator.negotiationEngine.getAllNegotiations(tenantId);
    res.json(negotiations);
});

router.post('/negotiations', async (req, res) => {
    try {
        const { initiatorId, participantIds, topic, context } = req.body;
        const tenantId = req.user?.tenant_id;

        const negotiation = await orchestrator.createNegotiation(initiatorId, participantIds, topic, context, tenantId);
        res.status(201).json(negotiation);
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

router.get('/negotiations/:id', (req, res) => {
    const { id } = req.params;
    const negotiation = orchestrator.negotiationEngine.getNegotiation(id);
    if (!negotiation) return res.status(404).json({ error: 'Not found' });

    // Security check: ensure tenant matches
    if (negotiation.tenantId !== req.user?.tenant_id) {
        return res.status(403).json({ error: 'Access denied' });
    }

    res.json(negotiation);
});

router.post('/negotiations/:id/proposals', async (req, res) => {
    try {
        const { id } = req.params;
        const { agentId, content } = req.body;

        const negotiation = await orchestrator.submitProposal(id, agentId, content);
        res.status(201).json(negotiation);
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

export default router;
