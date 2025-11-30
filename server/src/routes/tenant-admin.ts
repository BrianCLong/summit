import express from 'express';
import { TenantAdminService } from '../services/TenantAdminService.js';

const router = express.Router();
const service = new TenantAdminService();

// Middleware to extract tenantId would be here (e.g. from req.user or header)
// For now assuming req.headers['x-tenant-id']

router.get('/plan', async (req, res) => {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) return res.status(400).json({ error: 'Missing tenant ID' });
    try {
        const plan = await service.getPlan(tenantId);
        res.json(plan);
    } catch (e) {
        res.status(500).json({ error: (e as Error).message });
    }
});

router.post('/plan', async (req, res) => {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { planId } = req.body;
    if (!tenantId || !planId) return res.status(400).json({ error: 'Missing params' });
    try {
        await service.updatePlan(tenantId, planId);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: (e as Error).message });
    }
});

router.post('/residency', async (req, res) => {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { region, reason } = req.body;
    if (!tenantId || !region) return res.status(400).json({ error: 'Missing params' });
    try {
        const request = await service.requestResidencyChange(tenantId, region, reason);
        res.json(request);
    } catch (e) {
         res.status(500).json({ error: (e as Error).message });
    }
});

router.get('/residency', async (req, res) => {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) return res.status(400).json({ error: 'Missing tenant ID' });
     try {
        const requests = await service.getResidencyRequests(tenantId);
        res.json(requests);
    } catch (e) {
         res.status(500).json({ error: (e as Error).message });
    }
});

router.get('/invoice', async (req, res) => {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) return res.status(400).json({ error: 'Missing tenant ID' });

    // Simulate Invoice Generation
    const invoiceData = `
    INVOICE
    -------
    Tenant: ${tenantId}
    Date: ${new Date().toISOString()}
    Plan: Pro ($49/mo)
    Usage:
    - API Calls: 450,000 (included)
    - Storage: 12GB (included)
    - Egress: 89GB ($0.09/GB overage: $0.00)

    Total: $49.00

    Status: PAID
    Transaction ID: txn_${Math.random().toString(36).substring(7)}
    `;

    // Sign it (Mock)
    const crypto = await import('crypto');
    const signature = crypto.createHmac('sha256', 'secret').update(invoiceData).digest('hex');

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('X-Invoice-Signature', signature);
    res.send(invoiceData);
});

export default router;
