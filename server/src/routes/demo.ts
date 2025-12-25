import express from 'express';
import { logger } from '../config/logger.js';

const router = express.Router();

router.get('/status', (req, res) => {
  res.json({
    status: 'ready',
    mode: process.env.DEMO_MODE === '1' ? 'demo' : 'production',
    db: 'connected' // Fake for now
  });
});

router.post('/seed', async (req, res) => {
  logger.info('Demo seed requested');
  // Simulate delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  res.json({ status: 'seeded', duration: '1s' });
});

router.post('/reset', async (req, res) => {
  logger.info('Demo reset requested');
  // Simulate delay
  await new Promise(resolve => setTimeout(resolve, 500));
  res.json({ status: 'reset' });
});

export default router;
