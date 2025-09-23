import { Kafka, logLevel, CompressionTypes } from 'kafkajs';

export const kafka = new Kafka({
  clientId: 'intelgraph-gateway',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
  ssl: !!process.env.KAFKA_SSL,
  sasl: process.env.KAFKA_SASL_MECH ? {
    mechanism: process.env.KAFKA_SASL_MECH as any,
    username: process.env.KAFKA_SASL_USER!,
    password: process.env.KAFKA_SASL_PASS!
  } : undefined,
  logLevel: logLevel.ERROR
});

// Per advisory, enable transactional production for EOS.
export const producer = kafka.producer({
  allowAutoTopicCreation: true,
  idempotent: true,
  maxInFlightRequests: 1,
  transactionalId: 'intelgraph-producer-1', // Unique ID for the transactional producer
});

export async function startProducer() { if (!(producer as any).connected) await producer.connect(); }

/**
 * Publishes a message to a Kafka topic within a transaction for Exactly-Once Semantics.
 */
export async function publish(topic: string, key: string, value: unknown) {
  await startProducer();
  const transaction = await producer.transaction();

  try {
    await transaction.send({
      topic,
      compression: CompressionTypes.GZIP,
      messages: [{ key, value: JSON.stringify(value), headers: { 'schema': Buffer.from('v1') } }]
    });
    await transaction.commit();
  } catch (e) {
    await transaction.abort();
    console.error('Kafka transaction failed:', e);
    throw e; // Re-throw to allow upstream services to handle the failure
  }
}
