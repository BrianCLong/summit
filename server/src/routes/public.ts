import { Router } from 'express';
import healthRoutes from './health.js';

const router = Router();

router.use(healthRoutes);

export default router;
