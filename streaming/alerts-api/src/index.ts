import Fastify from 'fastify';
import { Kafka } from 'kafkajs';
import {
  clientConnected,
  clientDisconnected,
  metricsSnapshot,
  recordAlertStreamed,
  recordStreamError,
} from './metrics.js';

const fastify = Fastify({ logger: true });
const kafka = new Kafka({
  clientId: 'alerts-api',
  brokers: ['localhost:9092'],
});

fastify.get('/metrics', async (_request, reply) => {
  const metrics = await metricsSnapshot();
  reply.type('text/plain; version=0.0.4').send(metrics);
});

fastify.get('/alerts/stream', async (request, reply) => {
  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
  });
  clientConnected();
  request.raw.on('close', () => {
    clientDisconnected();
  });

  const consumer = kafka.consumer({ groupId: 'alerts-api' });
  await consumer.connect();
  await consumer.subscribe({ topic: 'alerts.v1' });
  await consumer.run({
    eachMessage: async ({ message }) => {
      try {
        reply.raw.write(`data: ${message.value?.toString()}\n\n`);
        recordAlertStreamed();
      } catch (err) {
        request.log.error({ err }, 'failed to stream alert');
        recordStreamError();
      }
    },
  });
});

fastify.listen({ port: 4000, host: '0.0.0.0' }).catch((err) => {
  fastify.log.error(err);
  process.exit(1);
});
