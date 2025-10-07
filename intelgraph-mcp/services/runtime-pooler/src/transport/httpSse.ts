import { FastifyInstance } from 'fastify';
import { emitFrame } from '../telemetry';
import { recordEvent } from '../replay-client';

type EventPayload = {
  id: number;
  event?: string;
  data: string;
};

const buffers = new Map<string, EventPayload[]>();
const lastIds = new Map<string, number>();
const HEARTBEAT_MS = Number(process.env.SSE_HEARTBEAT_MS ?? 15_000);
const BUFFER_SIZE = Number(process.env.SSE_BUFFER_SIZE ?? 256);

export function publish(sessionId: string, payload: { event?: string; data: string; recordingId?: string }) {
  const nextId = (lastIds.get(sessionId) ?? 0) + 1;
  lastIds.set(sessionId, nextId);
  const record: EventPayload = { id: nextId, ...payload };
  const store = buffers.get(sessionId) ?? [];
  store.push(record);
  if (store.length > BUFFER_SIZE) store.shift();
  buffers.set(sessionId, store);
  emitFrame('out', 'sse', { 'mcp.session.id': sessionId, 'mcp.sse.event': payload.event ?? 'message' });
  void recordEvent(payload.recordingId, 'out', 'sse', { event: payload.event, data: payload.data, id: nextId });
}

export function registerSse(app: FastifyInstance) {
  app.get('/v1/stream/:sessionId', async (req, reply) => {
    const { sessionId } = req.params as { sessionId: string };
    const resume = Number((req.headers['last-event-id'] as string) ?? (req.headers['x-last-event-id'] as string) ?? 0);

    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no'
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

function replayBufferedEvents(sessionId: string, resume: number, write: (chunk: string) => void) {
  const history = buffers.get(sessionId) ?? [];
  const toSend = history.filter((evt) => evt.id > resume);
  if (toSend.length === 0) {
    write(`event: ready\n`);
    write(`data: {"sessionId":"${sessionId}"}\n\n`);
    emitFrame('out', 'sse', { 'mcp.session.id': sessionId, 'mcp.sse.event': 'ready' });
    return;
  }
  for (const evt of toSend) {
    write(format(evt));
  }
}

function format(evt: EventPayload): string {
  const header = `id: ${evt.id}\n${evt.event ? `event: ${evt.event}\n` : ''}`;
  return `${header}data: ${evt.data}\n\n`;
}
