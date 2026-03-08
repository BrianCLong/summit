"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const ioredis_1 = __importDefault(require("ioredis"));
const uuid_1 = require("uuid");
const prom_client_1 = require("prom-client");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const redisConsumer = new ioredis_1.default(REDIS_URL);
const redisPublisher = new ioredis_1.default(REDIS_URL);
// Metrics
const eventsIngested = new prom_client_1.Counter({
    name: 'rt_events_ingested_total',
    help: 'Total events ingested',
    labelNames: ['topic', 'tenant'],
});
const eventsFanout = new prom_client_1.Counter({
    name: 'rt_events_fanout_total',
    help: 'Total events fanned out',
    labelNames: ['tenant'],
});
const deliveryLag = new prom_client_1.Gauge({
    name: 'rt_delivery_lag_seconds',
    help: 'Delivery lag in seconds',
    labelNames: ['tenant'],
});
const seenEvents = new Set(); // Simple in-memory dedupe for MVP
async function startConsumer() {
    const streams = [
        'events.graph.node',
        'events.graph.edge',
        'events.search',
        'events.workflow',
    ];
    const group = 'realtime-service-group';
    const consumer = `consumer-${(0, uuid_1.v4)()}`;
    // Ensure groups exist
    for (const stream of streams) {
        try {
            await redisConsumer.xgroup('CREATE', stream, group, '$', 'MKSTREAM');
        }
        catch (e) {
            if (!e.message.includes('BUSYGROUP'))
                throw e;
        }
    }
    console.log('Consumer started...');
    while (true) {
        try {
            // Read from all streams
            // @ts-ignore
            const response = await redisConsumer.xreadgroup('GROUP', group, consumer, 'BLOCK', 1000, 'STREAMS', ...streams, ...streams.map(() => '>'));
            if (response) {
                for (const [stream, messages] of response) {
                    for (const message of messages) {
                        const [id, fields] = message;
                        // fields is [key, value, key, value...]
                        // We expect ['event', JSONString]
                        const eventDataIdx = fields.indexOf('event');
                        if (eventDataIdx !== -1) {
                            const eventJson = fields[eventDataIdx + 1];
                            try {
                                const event = JSON.parse(eventJson);
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
                            }
                            catch (err) {
                                console.error('Error parsing event:', err);
                            }
                        }
                        // Ack
                        await redisConsumer.xack(stream, group, id);
                    }
                }
            }
        }
        catch (error) {
            console.error('Consumer error:', error);
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }
    }
}
app.get('/health', (req, res) => res.send('OK'));
app.get('/metrics', async (req, res) => {
    res.set('Content-Type', prom_client_1.register.contentType);
    res.end(await prom_client_1.register.metrics());
});
app.listen(PORT, () => {
    console.log(`Realtime Service listening on port ${PORT}`);
    startConsumer();
});
