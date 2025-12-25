import { Router } from 'express';
import { runAnomalyDetection, getAnomalies } from '../analytics/anomalies/AnomalyController.js';

const router = Router();

router.post('/anomalies/run', runAnomalyDetection);
router.get('/anomalies', getAnomalies);

export default router;
