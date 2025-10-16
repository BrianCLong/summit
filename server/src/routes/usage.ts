import express from 'express';
import { Pool } from 'pg';

const router = express.Router();
const pg = new Pool({ connectionString: process.env.DATABASE_URL });

router.get('/v1/usage/export', async (req, res) => {
  try {
    const month =
      (req.query.month as string) ||
      new Date().toISOString().slice(0, 7) + '-01';
    const { rows } = await pg.query(
      'SELECT tenant, month, cpu_sec, gb_sec, egress_gb, runs FROM usage_counters WHERE month=$1 ORDER BY tenant',
      [month],
    );
    res.setHeader('content-type', 'text/csv');
    res.setHeader(
      'content-disposition',
      `attachment; filename="usage_${month}.csv"`,
    );
    res.write('tenant,month,cpu_sec,gb_sec,egress_gb,runs\n');
    for (const r of rows)
      res.write(
        `${r.tenant},${r.month.toISOString().slice(0, 10)},${r.cpu_sec},${r.gb_sec},${r.egress_gb},${r.runs}\n`,
      );
    res.end();
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'failed' });
  }
});

export default router;
