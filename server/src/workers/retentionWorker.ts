import fs from 'node:fs';
import path from 'node:path';
import { pg } from '../db/pg';

function readRetentionDays(): { riskDays: number; evidenceDays: number } {
  try {
    const p = path.resolve(
      process.cwd(),
      'contracts/policy-pack/v0/data/retention.json',
    );
    const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
    const tiers = raw?.tiers || {};
    const defaults = raw?.defaults || {};
    const standardDays = tiers?.standard?.days ?? 180;
    const longDays = tiers?.long?.days ?? 365;
    return {
      riskDays: Number(process.env.RETENTION_RISK_DAYS || standardDays),
      evidenceDays: Number(process.env.RETENTION_EVIDENCE_DAYS || longDays),
    };
  } catch {
    return {
      riskDays: Number(process.env.RETENTION_RISK_DAYS || 180),
      evidenceDays: Number(process.env.RETENTION_EVIDENCE_DAYS || 365),
    };
  }
}

/**
 * Executes a single run of the data retention cleanup process.
 * Reads retention policies (from file or env) and deletes old risk signals and evidence bundles
 * that have exceeded their retention period.
 */
export async function runRetentionOnce() {
  const { riskDays, evidenceDays } = readRetentionDays();
  await pg.write(
    `DELETE FROM risk_signals WHERE created_at < now() - ($1 || ' days')::interval`,
    [String(riskDays)],
  );
  await pg.write(
    `DELETE FROM evidence_bundles WHERE created_at < now() - ($1 || ' days')::interval`,
    [String(evidenceDays)],
  );
}

let timer: any;

/**
 * Starts the retention worker.
 * Runs periodically based on `RETENTION_WORKER_INTERVAL_MS` (default 24 hours).
 * Checks `ENABLE_RETENTION_WORKER` env var to decide whether to start.
 */
export function startRetentionWorker() {
  if (process.env.ENABLE_RETENTION_WORKER !== 'true') return;
  const intervalMs = Number(
    process.env.RETENTION_WORKER_INTERVAL_MS || 24 * 3600 * 1000,
  );
  const tick = () =>
    runRetentionOnce().catch((e) => console.warn('retention error', e));
  timer = setInterval(tick, intervalMs);
  tick();
}

/**
 * Stops the retention worker if it is running.
 */
export function stopRetentionWorker() {
  if (timer) clearInterval(timer);
}
