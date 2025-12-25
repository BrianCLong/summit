import { Router } from 'express';
import { runRetention, getJobStatus } from '../analytics/retention/RetentionController.js';

const router = Router();

router.post('/analytics/retention/run', runRetention);
router.get('/analytics/retention/jobs/:id', getJobStatus);

export default router;
