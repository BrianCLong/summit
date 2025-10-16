import { startTemporalWorker } from './index.js';

let handle: Awaited<ReturnType<typeof startTemporalWorker>> | null = null;

export function setTemporalHandle(
  h: Awaited<ReturnType<typeof startTemporalWorker>>,
) {
  handle = h;
}

export async function enableTemporal() {
  if (process.env.TEMPORAL_ENABLED === 'true')
    return { ok: true, message: 'already enabled' } as any;
  process.env.TEMPORAL_ENABLED = 'true';
  handle = await startTemporalWorker();
  return { ok: true } as any;
}

export async function disableTemporal() {
  if (process.env.TEMPORAL_ENABLED !== 'true')
    return { ok: true, message: 'already disabled' } as any;
  process.env.TEMPORAL_ENABLED = 'false';
  try {
    await handle?.stop();
  } catch {}
  handle = null;
  return { ok: true } as any;
}
