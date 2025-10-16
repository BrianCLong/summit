import { Pool } from 'pg';

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
  const sig =
    req.headers['x-hub-signature-256'] || req.headers['x-intelgraph-signature'];
  if (!verifyHmac(sig, req.rawBody, process.env.WEBHOOK_SECRET!))
    return res.status(401).end();
  await triggerRunbook(req.query.runbook, {
    eventKey: req.headers['x-event-id'],
    value: req.body,
  });
  res.sendStatus(202);
}
function verifyHmac(sig: string, body: Buffer, secret: string) {
  // TODO: implement HMAC-SHA256 check
  return Boolean(sig && body && secret);
}
async function triggerRunbook(runbook: string, payload: any) {
  // TODO: enqueue a run with payload
}
