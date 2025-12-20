import Fastify from 'fastify';
import { v4 as uuid } from 'uuid';
import { Kafka, logLevel } from 'kafkajs';
import { metricsSnapshot, recordIngest, startProduceTimer } from './metrics.js';

const fastify = Fastify({ logger: true });
const kafka = new Kafka({
  clientId: 'ingest-gw',
  brokers: ['localhost:9092'],
  logLevel: logLevel.ERROR,
});
const producer = kafka.producer();

fastify.get('/metrics', async (_request, reply) => {
  const metrics = await metricsSnapshot();
  reply.type('text/plain; version=0.0.4').send(metrics);
});

fastify.post('/events', async (request, reply) => {
  const manifestId = uuid();
  const timer = startProduceTimer();
  try {
    const value = JSON.stringify({ ...request.body, manifestId });
    await producer.send({
      topic: 'ingest.raw.v1',
      messages: [{ key: manifestId, value }],
    });
    recordIngest('accepted');
    timer();
    reply.code(202).send({ manifestId });
  } catch (err) {
    recordIngest('failed');
    timer();
    request.log.error({ err }, 'failed to produce event');
    reply.code(500).send({ error: 'ingest_failed', manifestId });
  }
});

async function start() {
  await producer.connect();
  await fastify.listen({ port: 3000, host: '0.0.0.0' });
}

start().catch((err) => {
  fastify.log.error(err);
  process.exit(1);
});
