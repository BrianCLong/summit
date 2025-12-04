import { Router } from 'express';
import config from 'config';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: config.get<string>('service.name'),
    timestamp: new Date().toISOString()
  });
});

export default router;
