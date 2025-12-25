import { Router } from 'express';
import { createFunnel, getFunnelReport } from '../analytics/funnels/FunnelController.js';

const router = Router();

router.post('/funnels', createFunnel);
router.get('/funnels/:id/report', getFunnelReport);

export default router;
