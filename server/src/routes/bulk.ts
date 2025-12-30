import express from 'express';
import { BulkOperationService } from '../bulk/BulkOperationService.js';
import { BulkOperationPayload } from '../bulk/types.js';
import { ensureAuthenticated } from '../middleware/auth.js'; // Assuming this exists, based on nlp.js
import { randomUUID } from 'crypto';

const router = express.Router();
const bulkService = new BulkOperationService();

router.use(ensureAuthenticated);

const handleBulkRequest = (operationType: string) => async (req: express.Request, res: express.Response) => {
    try {
        const { items, requestId, dryRun, atomic, ...params } = req.body;

        if (!items || !Array.isArray(items)) {
            return res.status(400).json({ error: 'items array is required' });
        }

        const payload: BulkOperationPayload = {
            items,
            requestId: requestId || randomUUID(),
            dryRun: Boolean(dryRun),
            atomic: Boolean(atomic),
            operationType,
            params // Rest of body is params
        };

        const context = {
            tenantId: req.headers['x-tenant-id'] as string,
            userId: (req as any).user?.id,
            requestId: payload.requestId,
            pgPool: null // Service grabs its own pool
        };

        const result = await bulkService.process(context, payload);
        res.json(result);

    } catch (err: any) {
        if (err.message.includes('Unsupported')) {
            return res.status(404).json({ error: err.message });
        }
        res.status(500).json({ error: err.message });
    }
};

router.post('/tags/apply', handleBulkRequest('tags/apply'));
router.post('/annotations/delete', handleBulkRequest('annotations/delete'));
router.post('/triage/assign', handleBulkRequest('triage/assign'));

export default router;
