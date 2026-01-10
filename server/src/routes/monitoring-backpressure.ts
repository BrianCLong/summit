
import { Router } from 'express';
import { BackpressureController } from '../runtime/backpressure/BackpressureController.js';

const router = Router();

router.get('/metrics/backpressure', (req, res) => {
  const controller = BackpressureController.getInstance();
  const metrics = controller.getMetrics();
  res.json(metrics);
});

export default router;
