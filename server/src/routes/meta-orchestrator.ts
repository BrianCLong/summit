// @ts-nocheck
import express, { Response, NextFunction } from 'express';
import { MetaOrchestrator } from '../meta-orchestrator/MetaOrchestrator.js';
import { ensureAuthenticated } from '../middleware/auth.js';
import type { AuthenticatedRequest } from './types.js';

const router = express.Router();
const orchestrator = MetaOrchestrator.getInstance();

// Middleware to ensure auth
router.use(ensureAuthenticated);

// Agents
router.get('/agents', async (req, res) => {
  try {
    const tenantId = req.user?.tenant_id;
    const agents = await orchestrator.getAgents(tenantId);
    res.json(agents);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/agents', async (req, res) => {
  try {
    const agentData = req.body;
    const tenantId = req.user?.tenant_id;

    // Ensure tenantId matches
    if (!agentData.tenantId) {
        agentData.tenantId = tenantId;
    }

    if (agentData.tenantId !== tenantId) {
        return res.status(403).json({ error: 'Tenant mismatch' });
    }

    const agent = await orchestrator.registerAgent(agentData);
    res.status(201).json(agent);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/agents/:id/heartbeat', async (req, res) => {
    try {
        const { id } = req.params;
        const metrics = req.body; // { cpu, memory, activeTasks }
        await orchestrator.healthMonitor.reportHeartbeat(id, metrics);
        res.sendStatus(200);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/agents/:id/stop', async (req, res) => {
    try {
        const { id } = req.params;
        await orchestrator.registry.updateStatus(id, 'OFFLINE' as any);
        res.sendStatus(200);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/agents/:id/start', async (req, res) => {
    try {
        const { id } = req.params;
        await orchestrator.registry.updateStatus(id, 'IDLE' as any);
        res.sendStatus(200);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Messages
router.post('/agents/messages', async (req, res) => {
    try {
        const { topic, message } = req.body;
        const messageId = await orchestrator.messageBroker.publish(topic, message);
        res.status(201).json({ id: messageId });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});


// Negotiations
router.get('/negotiations', (req, res) => {
    const tenantId = req.user?.tenant_id;
    const negotiations = orchestrator.negotiationEngine.getAllNegotiations(tenantId);
    res.json(negotiations);
});

router.post('/negotiations', async (req: AuthenticatedRequest, res: Response) => {
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

router.post('/negotiations/:id/proposals', async (req: AuthenticatedRequest, res: Response) => {
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
