import express from 'express';
import { Pool } from 'pg';

const router = express.Router();
const pg = new Pool({ connectionString: process.env.DATABASE_URL });

router.get('/:runbook/:stepId', async (req, res) => {
  res.setHeader('content-type', 'text/event-stream');
  res.setHeader('cache-control', 'no-cache');
  const { runbook, stepId } = req.params as any;
  const send = async () => {
    const { rows } = await pg.query(
      'SELECT variant_key AS key, alpha, beta, reward_sum, pulls FROM bandit_state WHERE runbook=$1 AND step_id=$2',
      [runbook, stepId],
    );
    res.write(`data: ${JSON.stringify(rows)}

`);
  };
  const t = setInterval(send, 3000);
  req.on('close', () => clearInterval(t));
  await send();
});

export default router;
