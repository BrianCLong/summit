import { Router } from 'express';
import healthRoutes from './health';

const router = Router();

router.use(healthRoutes);

export default router;
