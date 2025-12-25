import { Router } from 'express';
import { explainabilityService } from '../services/ExplainabilityService';

const router = Router();

// GET /api/explain/node/:id
router.get('/node/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await explainabilityService.explainNode(id);
        res.json(result);
    } catch (error: any) {
        // If node not found
        if (error.message === 'Node not found') {
            return res.status(404).json({ error: error.message });
        }
        res.status(500).json({ error: error.message });
    }
});

export default router;
