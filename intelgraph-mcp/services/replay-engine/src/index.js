"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const recorder_1 = require("./recorder");
const replayer_1 = require("./replayer");
const storage_1 = require("./storage");
const app = (0, fastify_1.default)({ logger: true });
const recorder = new recorder_1.Recorder();
const replayer = new replayer_1.Replayer();
app.post('/v1/recordings', async (req, reply) => {
    const body = req.body;
    const seed = body?.seed ?? '0';
    const sessionId = body?.sessionId ?? 'unknown';
    const rec = recorder.start(sessionId, seed, body?.meta);
    storage_1.Storage.save(rec);
    return reply.code(201).send({ id: rec.id });
});
app.post('/v1/recordings/:id/events', async (req, reply) => {
    const params = req.params;
    const rec = storage_1.Storage.get(params.id);
    if (!rec) {
        return reply.code(404).send({ error: 'recording not found' });
    }
    const body = req.body;
    const entries = Array.isArray(body.events)
        ? body.events
        : [body];
    const accepted = [];
    for (const entry of entries) {
        if (!entry || (entry.dir !== 'in' && entry.dir !== 'out')) {
            return reply.code(400).send({ error: 'invalid dir' });
        }
        const channel = entry.channel;
        if (!['jsonrpc', 'sse', 'stdio', 'net', 'env'].includes(channel)) {
            return reply.code(400).send({ error: 'invalid channel' });
        }
        const event = recorder.push(rec, {
            t: Date.now(),
            dir: entry.dir,
            channel,
            payload: entry.payload,
        });
        accepted.push(event);
    }
    storage_1.Storage.save(rec);
    return reply.code(202).send({ accepted: accepted.length });
});
app.post('/v1/replay/:id', async (req, reply) => {
    const id = req.params.id;
    const rec = storage_1.Storage.get(id);
    if (!rec) {
        return reply.code(404).send({ error: 'not found' });
    }
    return reply.send(replayer.replay(rec));
});
app
    .listen({ port: Number(process.env.PORT || 8081), host: '0.0.0.0' })
    .catch((err) => {
    app.log.error(err);
    process.exit(1);
});
