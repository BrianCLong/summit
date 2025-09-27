import { Router } from 'express';
import fs from 'fs';
import path from 'path';

const router = Router();
const logFile = path.join(__dirname, '..', 'logs', 'audit.log');

router.get('/audit-logs', async (req, res) => {
  const limit = Number.parseInt(req.query.limit as string) || 50;
  try {
    await fs.promises.access(logFile);
    const data = await fs.promises.readFile(logFile, 'utf-8');
    const lines = data.trim().split('\n').filter(Boolean).slice(-limit);
    const entries = lines
      .map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
    res.json(entries);
  } catch {
    res.json([]);
  }
});

export default router;
