import express from 'express';
import { InboundAlertService } from '../../integrations/inbound/service.js';

const router = express.Router();
const service = new InboundAlertService();

// Public webhook endpoint (protected by signature/secret)
router.post('/integrations/inbound/:configId', async (req, res) => {
    try {
        const { configId } = req.params;
        const signature = req.headers['x-switchboard-signature'] as string || req.query.secret as string; // Simplified
        const tenantId = req.headers['x-tenant-id'] as string; // Or derive from configId lookup

        if (!tenantId) {
             return res.status(400).json({ error: 'Tenant ID required' });
        }

        const alert = await service.processAlert(tenantId, configId, req.body, signature);
        res.status(202).json({ message: 'Alert received', id: alert.id });
    } catch (error: any) {
        res.status(403).json({ error: error.message });
    }
});

export default router;
