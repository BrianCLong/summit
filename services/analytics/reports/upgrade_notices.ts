#!/usr/bin/env node
import { Pool } from 'pg';
const pg = new Pool({ connectionString: process.env.DATABASE_URL });

const THRESHOLD = parseInt(process.env.CAP_HITS_THRESHOLD || '50', 10); // N per 30d

(async () => {
  const { rows } = await pg.query(
    'select tenant_id, sum(hits_30d) as hits from mv_cap_hits_30d group by 1',
  );
  for (const r of rows) {
    const hits = parseInt(r.hits, 10);
    if (hits >= THRESHOLD) {
      const msg = `You're hitting exploration caps frequently (${hits}/30d). Consider upgrading for higher limits.`;
      await pg.query('select add_upgrade_notice($1,$2,$3)', [
        r.tenant_id,
        msg,
        24 * 7,
      ]); // visible for 7 days
    }
  }
  console.log('upgrade notices processed:', rows.length);
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
