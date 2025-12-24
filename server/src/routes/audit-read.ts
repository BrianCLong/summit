
import { Router } from 'express';
import { AuditQueryService } from '../audit-read/AuditQueryService';

const router = Router();
const service = new AuditQueryService();

router.get('/events', async (req, res) => {
    // In real app, req.user.tenantId comes from auth middleware
    const tenantId = req.query.tenantId as string;

    if (!tenantId) return res.status(403).json({ error: 'Tenant context required' });

    const filter = {
        tenantId,
        actorId: req.query.actorId as string,
        action: req.query.action as string,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined
    };

    const results = await service.search(filter);
    return res.json(results);
});

router.get('/events/:id', async (req, res) => {
    const tenantId = req.query.tenantId as string;
    if (!tenantId) return res.status(403).json({ error: 'Tenant context required' });

    const event = await service.getById(req.params.id, tenantId);
    if (!event) return res.status(404).json({ error: 'Not found' });

    return res.json(event);
});

export default router;
