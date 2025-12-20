import { recomputeTrustForTenant } from './trustScore.js';

const INTERVAL_MS = Number(process.env.TRUST_WORKER_INTERVAL_MS || 60000);

let timer: any;

/**
 * Starts the trust score calculation worker.
 * This worker periodically recomputes trust scores for specified tenants and subjects.
 * It checks the `ENABLE_TRUST_WORKER` environment variable to decide whether to start.
 */
export function startTrustWorker() {
  if (process.env.ENABLE_TRUST_WORKER !== 'true') return;
  const tenants = (process.env.TRUST_WORKER_TENANTS || 't0')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const subjects = (process.env.TRUST_WORKER_SUBJECTS || 'global')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  async function tick() {
    for (const t of tenants) {
      for (const s of subjects) {
        try {
          await recomputeTrustForTenant(t, s);
        } catch (e) {
          console.warn('trust worker error', e);
        }
      }
    }
  }
  timer = setInterval(tick, INTERVAL_MS);
  // initial kick
  tick().catch(() => {});
}

/**
 * Stops the trust score calculation worker if it is running.
 */
export function stopTrustWorker() {
  if (timer) clearInterval(timer);
}
