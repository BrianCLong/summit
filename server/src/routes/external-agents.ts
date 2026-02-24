import { Router } from 'express';
import { randomBytes } from 'crypto';
import { logger } from '../utils/logger.js';

const router = Router();

// In-memory store for demo/MVP purposes
// In a full implementation, this should be backed by Postgres (`db.query(...)`)
const externalAgents: any[] = [];

router.get('/', (req, res) => {
    try {
        // Return list of agents without secrets
        res.json({ agents: externalAgents });
    } catch (error: any) {
        logger.error('Failed to get external agents', { error: error.message });
        res.status(500).json({ error: 'Failed to retrieve external agents' });
    }
});

router.post('/', (req, res) => {
    try {
        const { name, permissions } = req.body;

        if (!name) {
            res.status(400).json({ error: 'Agent name is required' });
            return;
        }

        const clientId = `agent_${randomBytes(8).toString('hex')}`;
        const clientSecret = randomBytes(32).toString('base64');

        const newAgent = {
            id: clientId,
            name,
            status: 'active',
            roles: permissions || ['service_account', 'external_agent'],
            createdAt: new Date().toISOString()
        };

        externalAgents.push(newAgent);
        logger.info({ agentId: clientId, name }, 'Registered new external agent');

        // The secret is only returned once upon creation
        res.status(201).json({
            agent: newAgent,
            credentials: {
                clientId,
                clientSecret
            }
        });
    } catch (error: any) {
        logger.error('Failed to register external agent', { error: error.message });
        res.status(500).json({ error: 'Failed to register external agent' });
    }
});

router.delete('/:id', (req, res) => {
    const index = externalAgents.findIndex(a => a.id === req.params.id);
    if (index === -1) {
        res.status(404).json({ error: 'Agent not found' });
        return;
    }

    externalAgents.splice(index, 1);
    logger.info({ agentId: req.params.id }, 'Revoked external agent');
    res.json({ success: true });
});

export default router;
