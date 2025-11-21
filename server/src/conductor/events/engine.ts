import { Pool } from 'pg';
import { createHmac, timingSafeEqual } from 'crypto';
import logger from '../../config/logger.js';

// Optional kafka integration: load lazily to avoid hard dep when not used
let Kafka: any;
try {
  Kafka = require('kafkajs').Kafka;
} catch {}

const pg = new Pool({ connectionString: process.env.DATABASE_URL });
const kafka = Kafka
  ? new Kafka({
      clientId: 'conductor-events',
      brokers: (process.env.KAFKA || '').split(',').filter(Boolean),
    })
  : null;

export async function startKafkaSource(src: {
  id: number;
  topic: string;
  group: string;
  runbook: string;
}) {
  if (!kafka) throw new Error('kafkajs not available');
  const consumer = kafka.consumer({ groupId: src.group });
  await consumer.connect();
  await consumer.subscribe({ topic: src.topic, fromBeginning: false });
  await consumer.run({
    eachMessage: async ({ partition, message }: any) => {
      const key = message.key?.toString() || `${partition}:${message.offset}`;
      const off = Number(message.offset);
      const ok = await claimOffset(src, partition, off);
      if (!ok) return; // already processed
      await triggerRunbook(src.runbook, {
        eventKey: key,
        value: message.value?.toString(),
      });
      await storeOffset(src, partition, off);
    },
  });
}

async function claimOffset(src: any, partition: number, offset: number) {
  const { rowCount } = await pg.query(
    `INSERT INTO stream_offset(runbook, source_id, partition, offset)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT (runbook,source_id,partition) DO NOTHING`,
    [src.runbook, src.id, partition, offset],
  );
  return rowCount > 0;
}
async function storeOffset(src: any, partition: number, offset: number) {
  await pg.query(
    `UPDATE stream_offset SET offset=$1, updated_at=now() WHERE runbook=$2 AND source_id=$3 AND partition=$4`,
    [offset, src.runbook, src.id, partition],
  );
}

export async function webhookHandler(req: any, res: any) {
  const eventId = req.headers['x-event-id'] || 'unknown';
  const runbook = req.query.runbook;
  const sig =
    req.headers['x-hub-signature-256'] || req.headers['x-intelgraph-signature'];

  if (!verifyHmac(sig, req.rawBody, process.env.WEBHOOK_SECRET || '')) {
    logger.warn({ eventId, runbook }, 'Webhook signature verification failed');
    return res.status(401).end();
  }

  logger.info({ eventId, runbook }, 'Webhook signature verified successfully');

  await triggerRunbook(runbook, {
    eventKey: eventId,
    value: req.body,
  });
  res.sendStatus(202);
}

/**
 * Verifies an HMAC signature for webhook payloads.
 * Supports GitHub-style signatures (sha256=hash or sha1=hash).
 * Uses timing-safe comparison to prevent timing attacks.
 */
export function verifyHmac(sig: string | undefined, body: Buffer | undefined, secret: string): boolean {
  if (!sig || !body || !secret) return false;

  // Extract the hash from the signature (e.g., "sha256=abcd1234...")
  const parts = sig.split('=');
  if (parts.length !== 2) return false;

  const [algorithm, providedHash] = parts;

  // Support both sha256 and sha1 (though sha256 is preferred)
  if (algorithm !== 'sha256' && algorithm !== 'sha1') return false;

  // Validate provided hash is valid hex
  if (!/^[a-f0-9]+$/i.test(providedHash)) return false;

  // Compute the expected HMAC
  const hmac = createHmac(algorithm, secret);
  hmac.update(body);
  const expectedHash = hmac.digest('hex');

  // Timing-safe comparison to prevent timing attacks
  try {
    const providedBuf = Buffer.from(providedHash, 'hex');
    const expectedBuf = Buffer.from(expectedHash, 'hex');

    // Ensure buffers are same length before comparison
    if (providedBuf.length !== expectedBuf.length) return false;

    return timingSafeEqual(providedBuf, expectedBuf);
  } catch {
    // If any error occurs during comparison, reject
    return false;
  }
}
async function triggerRunbook(runbook: string, payload: any) {
  // TODO: enqueue a run with payload
}
