import { Router } from 'express';
import { Pool } from 'pg';

const pg = new Pool({ connectionString: process.env.DATABASE_URL });
const r = Router();

r.get('/sites/stream', async (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  const tick = async () => {
    const { rows } = await pg.query(
      `SELECT s.id, s.name, s.region, s.residency, s.bandwidth_class AS bandwidth,
              COALESCE((SELECT count(*) FROM sync_outbox o WHERE o.site_id=s.id AND o.status='QUEUED'),0) AS backlog,
              to_char(s.last_seen, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as lastSync
       FROM sites s ORDER BY s.name`,
    );
    res.write(`data: ${JSON.stringify(rows)}\n\n`);
  };
  const i = setInterval(tick, 2000);
  await tick();
  req.on('close', () => clearInterval(i));
});

export default r;
