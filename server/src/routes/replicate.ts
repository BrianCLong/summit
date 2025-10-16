import { Router } from 'express';
import { Pool } from 'pg';

const pg = new Pool({ connectionString: process.env.DATABASE_URL });
const r = Router();

r.get('/replicate', async (req, res) => {
  const since = Number(req.query.since || 0);
  res.setHeader('content-type', 'application/x-ndjson');
  const { rows } = await pg.query(
    `SELECT seq, region, site_id, run_id, event, payload, lamport, ts
     FROM run_ledger WHERE seq > $1 ORDER BY seq ASC LIMIT 10000`,
    [since],
  );
  for (const row of rows) res.write(JSON.stringify(row) + '\n');
  res.end();
});

export default r;
