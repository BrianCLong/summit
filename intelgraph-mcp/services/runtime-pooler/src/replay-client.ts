import { createHash } from 'node:crypto';

const BASE_URL = process.env.REPLAY_ENGINE_URL ?? 'http://localhost:8081';
const BATCH_SIZE = Number(process.env.REPLAY_BATCH_SIZE ?? 100);
const BATCH_INTERVAL_MS = Number(process.env.REPLAY_BATCH_INTERVAL_MS ?? 1000);

type PendingEvent = { dir: 'in' | 'out'; channel: string; payload: unknown };
type PendingBatch = { events: PendingEvent[]; timer?: NodeJS.Timeout };

const batches = new Map<string, PendingBatch>();

export async function createRecording(
  sessionId: string,
  toolClass: string,
): Promise<string | undefined> {
  try {
    const res = await fetch(`${BASE_URL}/v1/recordings`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sessionId, seed: '0', meta: { toolClass } }),
    });
    if (!res.ok) throw new Error(`replay create failed: ${res.status}`);
    const json = (await res.json()) as { id: string };
    return json.id;
  } catch (err) {
    console.warn('replay createRecording failed', err);
    return undefined;
  }
}

export function recordEvent(
  recordingId: string | undefined,
  dir: 'in' | 'out',
  channel: string,
  payload: unknown,
) {
  if (!recordingId) return;
  let batch = batches.get(recordingId);
  if (!batch) {
    batch = { events: [] };
    batches.set(recordingId, batch);
  }
  batch.events.push({ dir, channel, payload });
  if (batch.events.length >= BATCH_SIZE) {
    void flush(recordingId);
    return;
  }
  if (!batch.timer) {
    batch.timer = setTimeout(() => {
      void flush(recordingId);
    }, BATCH_INTERVAL_MS);
    batch.timer.unref?.();
  }
}

async function flush(recordingId: string) {
  const batch = batches.get(recordingId);
  if (!batch || batch.events.length === 0) return;
  if (batch.timer) {
    clearTimeout(batch.timer);
    batch.timer = undefined;
  }
  const events = batch.events.splice(0, batch.events.length);
  const payload = JSON.stringify({ events });
  const signature = createHash('sha256').update(payload).digest('hex');
  try {
    const res = await fetch(`${BASE_URL}/v1/recordings/${recordingId}/events`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-ig-signature': `sha256=${signature}`,
      },
      body: payload,
    });
    if (!res.ok) {
      console.warn('replay recordEvent failed', res.status);
      batch.events.unshift(...events);
      schedule(recordingId, batch);
    }
  } catch (err) {
    console.warn('replay recordEvent error', err);
    batch.events.unshift(...events);
    schedule(recordingId, batch);
  }
}

function schedule(recordingId: string, batch: PendingBatch) {
  if (batch.timer) return;
  batch.timer = setTimeout(() => {
    void flush(recordingId);
  }, BATCH_INTERVAL_MS);
  batch.timer.unref?.();
}
