import { Pool } from 'pg';
import { makeBundle } from './disclosure/bundle.js';
import {
  retractionsProcessed,
  retractionsDuration,
  retractionsSlaBreaches,
} from './metrics/retractionsMetrics.js';

const pg = new Pool({ connectionString: process.env.DATABASE_URL });

export async function enqueueRetraction(subject: string, reason: string) {
  const {
    rows: [r],
  } = await pg.query(
    `INSERT INTO retraction(subject,reason,status) VALUES ($1,$2,'QUEUED') RETURNING id, subject, reason, status, created_at`,
    [subject, reason],
  );
  return r;
}

export async function processRetractionsOnce() {
  const { rows } = await pg.query(
    `SELECT id, subject, created_at FROM retraction WHERE status='QUEUED' LIMIT 10`,
  );
  for (const r of rows) {
    try {
      // Find affected bundles (requires a bundle_index or join; stub via claim table by subject)
      const aff = await pg.query(
        `SELECT b.id as bundle_id, b.uri FROM bundles b JOIN claim c ON c.claimset_id = b.id WHERE c.subject=$1`,
        [r.subject],
      );
      for (const x of aff.rows) {
        // Domain-specific redaction would happen here; we just re-bundle claimset placeholder
        const nb = await makeBundle({
          artifacts: [{ name: 'redacted.txt', path: '/etc/hosts' }],
          claimSet: { id: `claimset-${x.bundle_id}-r`, claims: [] },
          merkleRoot: '',
          attestations: [],
        });
        await pg.query(`UPDATE bundles SET superseded_by=$1 WHERE id=$2`, [
          nb.path,
          x.bundle_id,
        ]);
      }
      await pg.query(`UPDATE retraction SET status='DONE' WHERE id=$1`, [r.id]);
      const ageSec = (Date.now() - new Date(r.created_at).getTime()) / 1000;
      retractionsProcessed.labels('DONE').inc();
      retractionsDuration.observe(ageSec);
      const slaSec = Number(process.env.RETRACTION_SLA_SECONDS || 72 * 3600);
      if (ageSec > slaSec) retractionsSlaBreaches.inc();
    } catch (e) {
      await pg.query(`UPDATE retraction SET status='FAILED' WHERE id=$1`, [
        r.id,
      ]);
      retractionsProcessed.labels('FAILED').inc();
    }
  }
}
