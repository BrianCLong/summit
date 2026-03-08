"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.publish = publish;
exports.registerSse = registerSse;
const telemetry_1 = require("../telemetry");
const replay_client_1 = require("../replay-client");
const buffers = new Map();
const lastIds = new Map();
const HEARTBEAT_MS = Number(process.env.SSE_HEARTBEAT_MS ?? 15_000);
const BUFFER_SIZE = Number(process.env.SSE_BUFFER_SIZE ?? 256);
function publish(sessionId, payload) {
    const nextId = (lastIds.get(sessionId) ?? 0) + 1;
    lastIds.set(sessionId, nextId);
    const record = { id: nextId, ...payload };
    const store = buffers.get(sessionId) ?? [];
    store.push(record);
    if (store.length > BUFFER_SIZE)
        store.shift();
    buffers.set(sessionId, store);
    (0, telemetry_1.emitFrame)('out', 'sse', {
        'mcp.session.id': sessionId,
        'mcp.sse.event': payload.event ?? 'message',
    });
    void (0, replay_client_1.recordEvent)(payload.recordingId, 'out', 'sse', {
        event: payload.event,
        data: payload.data,
        id: nextId,
    });
}
function registerSse(app) {
    app.get('/v1/stream/:sessionId', async (req, reply) => {
        const { sessionId } = req.params;
        const resume = Number(req.headers['last-event-id'] ??
            req.headers['x-last-event-id'] ??
            0);
        reply.raw.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
            'X-Accel-Buffering': 'no',
        });
        replayBufferedEvents(sessionId, resume, reply.raw.write.bind(reply.raw));
        const hb = setInterval(() => {
            reply.raw.write(`:hb\n\n`);
        }, HEARTBEAT_MS);
        req.raw.on('close', () => {
            clearInterval(hb);
        });
    });
}
function replayBufferedEvents(sessionId, resume, write) {
    const history = buffers.get(sessionId) ?? [];
    const toSend = history.filter((evt) => evt.id > resume);
    if (toSend.length === 0) {
        write(`event: ready\n`);
        write(`data: {"sessionId":"${sessionId}"}\n\n`);
        (0, telemetry_1.emitFrame)('out', 'sse', {
            'mcp.session.id': sessionId,
            'mcp.sse.event': 'ready',
        });
        return;
    }
    for (const evt of toSend) {
        write(format(evt));
    }
}
function format(evt) {
    const header = `id: ${evt.id}\n${evt.event ? `event: ${evt.event}\n` : ''}`;
    return `${header}data: ${evt.data}\n\n`;
}
