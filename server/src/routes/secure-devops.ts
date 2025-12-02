
import { Router } from 'express';
import { AgentFactory } from '../products/SecureDevOpsFactory/AgentFactory.js';

const router = Router();
const factory = new AgentFactory();

/**
 * @route POST /api/secure-devops/spawn
 * @description Spawns a secure agent swarm for a PR review.
 */
router.post('/spawn', async (req, res) => {
    try {
        const { prId, content } = req.body;
        if (!prId || !content) {
            return res.status(400).json({ error: 'Missing prId or content' });
        }

        const result = await factory.spawnAgentSwarm(prId, content);
        res.json(result);
    } catch (error) {
        console.error('Error spawning swarm:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
