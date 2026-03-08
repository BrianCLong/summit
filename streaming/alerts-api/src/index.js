"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const kafkajs_1 = require("kafkajs");
const metrics_js_1 = require("./metrics.js");
const fastify = (0, fastify_1.default)({ logger: true });
const kafka = new kafkajs_1.Kafka({
    clientId: 'alerts-api',
    brokers: ['localhost:9092'],
});
fastify.get('/metrics', async (_request, reply) => {
    const metrics = await (0, metrics_js_1.metricsSnapshot)();
    reply.type('text/plain; version=0.0.4').send(metrics);
});
fastify.get('/alerts/stream', async (request, reply) => {
    reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
    });
    (0, metrics_js_1.clientConnected)();
    request.raw.on('close', () => {
        (0, metrics_js_1.clientDisconnected)();
    });
    const consumer = kafka.consumer({ groupId: 'alerts-api' });
    await consumer.connect();
    await consumer.subscribe({ topic: 'alerts.v1' });
    await consumer.run({
        eachMessage: async ({ message }) => {
            try {
                reply.raw.write(`data: ${message.value?.toString()}\n\n`);
                (0, metrics_js_1.recordAlertStreamed)();
            }
            catch (err) {
                request.log.error({ err }, 'failed to stream alert');
                (0, metrics_js_1.recordStreamError)();
            }
        },
    });
});
fastify.listen({ port: 4000, host: '0.0.0.0' }).catch((err) => {
    fastify.log.error(err);
    process.exit(1);
});
