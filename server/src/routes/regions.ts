import { Router } from 'express';
import { getPostgresPool } from '../db/postgres.js';
import { cacheService } from '../services/cacheService.js';

// Use the managed pool instead of creating a new one
const r = Router();

r.get('/regions/stream', async (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  const tick = async () => {
    try {
      const pool = getPostgresPool();

      // 1. Get Max Seq (Cached)
      // This query runs every 2s per client. High load if many clients.
      // Cache for 1 second to allow some aggregation across clients.
      const { rows: latest } = await pool.read(
        `SELECT COALESCE(MAX(seq),0) AS max FROM run_ledger`,
        [],
        { cache: { key: 'regions:max_seq', ttl: 1 } }
      );
      const max = Number(latest[0].max || 0);

      // 2. Get Watermarks (Cached)
      const { rows: wms } = await pool.read(
        `SELECT peer, last_seq, EXTRACT(EPOCH FROM now()-updated_at)::int AS age FROM ledger_watermarks`,
        [],
        { cache: { key: 'regions:watermarks', ttl: 1 } }
      );

      const out = wms.map((w: any) => ({
        region: process.env.REGION_ID,
        peer: w.peer,
        seq: Number(w.last_seq || 0),
        lag: Math.max(0, max - Number(w.last_seq || 0)),
        status: Number(w.age || 9999) < 30 ? 'healthy' : 'stale',
      }));
      res.write(`data: ${JSON.stringify(out)}\n\n`);
    } catch (err) {
      // Log error but keep stream open if possible, or close it
      console.error('Error in regions stream tick:', err);
    }
  };

  const id = setInterval(tick, 2000);
  await tick();
  req.on('close', () => clearInterval(id));
});

export default r;
