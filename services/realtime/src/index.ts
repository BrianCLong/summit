import express from 'express';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { register, Gauge, Counter } from 'prom-client';

// Local definition if import fails in this env
interface EventEnvelope {
  v: string;
  event_id: string;
  ts: string;
  tenant: string;
  type: string;
  entity: { kind: string; id: string };
  revision: number;
  payload: any;
  trace?: any;
}

const app = express();
const PORT = process.env.PORT || 3000;
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const redisConsumer = new Redis(REDIS_URL);
const redisPublisher = new Redis(REDIS_URL);

// Metrics
const eventsIngested = new Counter({
  name: 'rt_events_ingested_total',
  help: 'Total events ingested',
  labelNames: ['topic', 'tenant'],
});

const eventsFanout = new Counter({
  name: 'rt_events_fanout_total',
  help: 'Total events fanned out',
  labelNames: ['tenant'],
});

const deliveryLag = new Gauge({
  name: 'rt_delivery_lag_seconds',
  help: 'Delivery lag in seconds',
  labelNames: ['tenant'],
});

const seenEvents = new Set<string>(); // Simple in-memory dedupe for MVP

async function startConsumer() {
  const streams = [
    'events.graph.node',
    'events.graph.edge',
    'events.search',
    'events.workflow',
  ];
  const group = 'realtime-service-group';
  const consumer = `consumer-${uuidv4()}`;

  // Ensure groups exist
  for (const stream of streams) {
    try {
      await redisConsumer.xgroup('CREATE', stream, group, '$', 'MKSTREAM');
    } catch (e: any) {
      if (!e.message.includes('BUSYGROUP')) throw e;
    }
  }

  console.log('Consumer started...');

  while (true) {
    try {
      // Read from all streams
      // @ts-ignore
      const response = await redisConsumer.xreadgroup(
        'GROUP',
        group,
        consumer,
        'BLOCK',
        1000,
        'STREAMS',
        ...streams,
        ...streams.map(() => '>')
      );

      if (response) {
        for (const [stream, messages] of response as any) {
          for (const message of messages) {
            const [id, fields] = message;
            // fields is [key, value, key, value...]
            // We expect ['event', JSONString]
            const eventDataIdx = fields.indexOf('event');
            if (eventDataIdx !== -1) {
              const eventJson = fields[eventDataIdx + 1];
              try {
                const event: EventEnvelope = JSON.parse(eventJson);

                // Dedupe
                if (seenEvents.has(event.event_id)) {
                  console.log('Duplicate event:', event.event_id);
                  await redisConsumer.xack(stream, group, id);
                  continue;
                }
                seenEvents.add(event.event_id);
                if (seenEvents.size > 10000) {
                  const it = seenEvents.values();
                  seenEvents.delete(it.next().value);
                }

                // Metrics
                eventsIngested.inc({ topic: stream, tenant: event.tenant });
                const lag = (Date.now() - new Date(event.ts).getTime()) / 1000;
                deliveryLag.set({ tenant: event.tenant }, lag);

                // Fanout to Redis PubSub
                // Channel: realtime:fanout
                await redisPublisher.publish('realtime:fanout', JSON.stringify(event));
                eventsFanout.inc({ tenant: event.tenant });

              } catch (err) {
                console.error('Error parsing event:', err);
              }
            }

            // Ack
            await redisConsumer.xack(stream, group, id);
          }
        }
      }
    } catch (error) {
      console.error('Consumer error:', error);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

app.get('/health', (req, res) => res.send('OK'));
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.listen(PORT, () => {
  console.log(`Realtime Service listening on port ${PORT}`);
  startConsumer();
});
