"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const uuid_1 = require("uuid");
const kafkajs_1 = require("kafkajs");
const metrics_js_1 = require("./metrics.js");
const fastify = (0, fastify_1.default)({ logger: true });
const kafka = new kafkajs_1.Kafka({
    clientId: 'ingest-gw',
    brokers: ['localhost:9092'],
    logLevel: kafkajs_1.logLevel.ERROR,
});
const producer = kafka.producer();
fastify.get('/metrics', async (_request, reply) => {
    const metrics = await (0, metrics_js_1.metricsSnapshot)();
    reply.type('text/plain; version=0.0.4').send(metrics);
});
fastify.post('/events', async (request, reply) => {
    const manifestId = (0, uuid_1.v4)();
    const timer = (0, metrics_js_1.startProduceTimer)();
    try {
        const value = JSON.stringify({ ...request.body, manifestId });
        await producer.send({
            topic: 'ingest.raw.v1',
            messages: [{ key: manifestId, value }],
        });
        (0, metrics_js_1.recordIngest)('accepted');
        timer();
        reply.code(202).send({ manifestId });
    }
    catch (err) {
        (0, metrics_js_1.recordIngest)('failed');
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
