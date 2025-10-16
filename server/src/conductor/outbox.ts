// Conductor Outbox Publisher (Kafka)
import { Pool } from 'pg';

// Lazy import Kafka to avoid hard dependency if not configured
async function getProducer() {
  const brokers = (process.env.KAFKA || '').split(',').filter(Boolean);
  if (!brokers.length) throw new Error('KAFKA not configured');
  const { Kafka } = await import('kafkajs');
  const kafka = new Kafka({ clientId: 'conductor', brokers });
  const producer = kafka.producer();
  await producer.connect();
  return producer;
}

const pg = new Pool({ connectionString: process.env.DATABASE_URL });

export async function outboxPublishLoop() {
  const producer = await getProducer();
  for (;;) {
    const client = await pg.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(
        `SELECT id, topic, key, value FROM outbox WHERE sent_at IS NULL ORDER BY id LIMIT 200 FOR UPDATE SKIP LOCKED`,
      );
      if (!rows.length) {
        await client.query('COMMIT');
        await new Promise((r) => setTimeout(r, 500));
        continue;
      }
      const batches: Record<string, any[]> = {};
      for (const r of rows) {
        (batches[r.topic] ??= []).push({
          key: r.key,
          value: JSON.stringify(r.value),
        });
      }
      await producer.sendBatch({
        topicMessages: Object.entries(batches).map(([topic, messages]) => ({
          topic,
          messages,
        })),
      });
      const ids = rows.map((r) => r.id);
      await client.query(
        `UPDATE outbox SET sent_at = now() WHERE id = ANY($1::bigint[])`,
        [ids],
      );
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  }
}
