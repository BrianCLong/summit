
import { Router } from 'express';
import { ScoringEngine } from '../evidence-quality/ScoringEngine';
import { EvidenceItem } from '../evidence-quality/types';

const router = Router();

// Mock DB fetcher
const getEvidenceById = async (id: string): Promise<EvidenceItem | null> => {
    // In real app, DB call
    if (id === 'ev-1') return {
        id: 'ev-1',
        sourceType: 'official',
        hasDigitalSignature: true,
        timestamp: new Date(),
        corroborationCount: 5
    };
    return null;
};

router.get('/quality', async (req, res) => {
    const id = req.query.id as string;
    if (!id) return res.status(400).json({ error: 'Missing id' });

    const item = await getEvidenceById(id);
    if (!item) return res.status(404).json({ error: 'Not found' });

    const result = ScoringEngine.calculateScore(item);
    return res.json(result);
});

router.post('/quality/batch', async (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids)) return res.status(400).json({ error: 'ids must be array' });

    const results: any[] = [];
    for (const id of ids) {
        const item = await getEvidenceById(id);
        if (item) {
            results.push({ id, ...ScoringEngine.calculateScore(item) });
        } else {
            results.push({ id, error: 'Not found' });
        }
    }
    return res.json(results);
});

export default router;
