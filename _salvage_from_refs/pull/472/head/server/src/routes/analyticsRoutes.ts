import express, { Request, Response } from 'express';
import { getPostgresPool } from '../db/postgres.js';

const router = express.Router();
router.use(express.json());

router.get('/llm-usage', async (_req: Request, res: Response) => {
  try {
    const pg = getPostgresPool();
    const { rows } = await pg.query(
      `SELECT model_name, COUNT(*) AS total_calls
       FROM llm_usage_logs
       GROUP BY model_name
       ORDER BY total_calls DESC`
    );
    res.json({ data: rows });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to fetch LLM usage',
      details: error.message,
    });
  }
});

export default router;
