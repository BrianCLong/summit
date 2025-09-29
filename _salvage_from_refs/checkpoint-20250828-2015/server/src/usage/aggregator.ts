import { Kafka } from 'kafkajs';
import { Pool } from 'pg';

const KAFKA_BROKERS = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
const USAGE_TOPIC = 'intelgraph.usage.v1';
const CONSUMER_GROUP = 'usage-aggregator-1';

const kafka = new Kafka({ clientId: 'usage-aggregator', brokers: KAFKA_BROKERS });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

/**
 * Starts a Kafka consumer to listen for usage events and aggregate them into PostgreSQL.
 */
export async function startUsageAggregator() {
  const consumer = kafka.consumer({ groupId: CONSUMER_GROUP });
  
  try {
    await consumer.connect();
    await consumer.subscribe({ topic: USAGE_TOPIC, fromBeginning: false });
    console.log(`[Usage Aggregator] Subscribed to topic: ${USAGE_TOPIC}`);

    await consumer.run({
      eachBatchAutoResolve: true,
      eachBatch: async ({ batch, resolveOffset, heartbeat, isRunning, isStale }) => {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          const query = 'INSERT INTO usage_event (tenant_id, feature, amount, ts, attrs) VALUES ($1, $2, $3, $4, $5)';
          
          for (const message of batch.messages) {
            if (!isRunning() || isStale()) break;
            if (!message.value) continue;

            const event = JSON.parse(message.value.toString());
            const values = [
              event.tenantId,
              event.feature,
              event.amount || 1,
              event.ts,
              event.attrs || {}
            ];
            await client.query(query, values);
            resolveOffset(message.offset);
          }
          await client.query('COMMIT');
        } catch (e) {
          await client.query('ROLLBACK');
          console.error('[Usage Aggregator] Error processing batch, rolling back:', e);
          // In production, you might want a more robust error handling/retry mechanism.
        } finally {
          client.release();
        }
        await heartbeat();
      },
    });

  } catch (e) {
    console.error(`[Usage Aggregator] Failed to start: ${e}`);
    process.exit(1);
  }
}
