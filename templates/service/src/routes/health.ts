import { Router } from 'express';

const router = Router();

router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

router.get('/ready', (req, res) => {
  // Add readiness checks here (e.g., db connection)
  res.status(200).json({ status: 'ready' });
});

export default router;
