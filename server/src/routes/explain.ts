import { Router } from 'express';
import { explainabilityService } from '../services/ExplainabilityService';
import { explanationBookmarkService } from '../services/ExplanationBookmarkService';

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

// POST /api/explain/bookmarks
router.post('/bookmarks', async (req, res) => {
    try {
        const { explanation } = req.body;
        if (!explanation) {
            return res.status(400).json({ error: 'Explanation data is required' });
        }
        const result = await explanationBookmarkService.saveBookmark(explanation);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/explain/bookmarks/:id
router.get('/bookmarks/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const explanation = await explanationBookmarkService.getBookmark(id);
        if (!explanation) {
            return res.status(404).json({ error: 'Bookmark not found' });
        }
        res.json(explanation);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
