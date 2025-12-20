import { recomputeTrustForTenant } from './trustScore.js';

const INTERVAL_MS = Number(process.env.TRUST_WORKER_INTERVAL_MS || 60000);

let timer: any;

/**
 * Starts the trust score recalculation worker.
 * This worker periodically recomputes trust scores for configured tenants and subjects.
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
 * Stops the trust score recalculation worker.
 */
export function stopTrustWorker() {
  if (timer) clearInterval(timer);
}
