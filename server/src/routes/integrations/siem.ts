import express from 'express';
import { SplunkSIEMSink } from '../../integrations/splunk/exporter.js';
import { requireAuth } from '../../middleware/unifiedAuth.js';
import { requireRole } from '../../middleware/rbac.js';

const router = express.Router();

router.post('/tenants/:tenantId/integrations/siem/test', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const config = req.body;
        const sink = new SplunkSIEMSink(config);
        const success = await sink.testConnection();
        if (success) {
            res.json({ message: 'Connection successful' });
        } else {
            res.status(400).json({ error: 'Connection failed' });
        }
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
