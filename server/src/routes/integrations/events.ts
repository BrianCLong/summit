import express from 'express';
import { eventService } from '../../events/EventService';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/roles';

const router = express.Router();

// POST /tenants/{id}/integrations/events/sinks
router.post('/tenants/:tenantId/integrations/events/sinks', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const { tenantId } = req.params;
        // Verify user belongs to tenant or is super admin
        if (req.user?.tenantId !== tenantId) { // simplified check
             return res.status(403).json({ error: 'Unauthorized' });
        }

        await eventService.createSink({
            ...req.body,
            tenant_id: tenantId
        });
        res.status(201).json({ message: 'Sink created' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// POST /events/replay (Policy gated)
router.post('/events/replay', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const receipt = await eventService.replay({
            tenantId: req.user!.tenantId!,
            startTime: new Date(req.body.startTime),
            endTime: new Date(req.body.endTime),
            eventTypes: req.body.eventTypes,
            sinkIds: req.body.sinkIds
        }, req.user!.id);

        res.json({ message: 'Replay initiated', receipt });
    } catch (error: any) {
         res.status(500).json({ error: error.message });
    }
});

export default router;
