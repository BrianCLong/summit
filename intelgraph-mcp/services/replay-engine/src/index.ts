import Fastify from 'fastify';
import { Recorder } from './recorder';
import { Replayer } from './replayer';
import { Storage } from './storage';
import type { IOChannel } from './model';

const app = Fastify({ logger: true });
const recorder = new Recorder();
const replayer = new Replayer();

app.post('/v1/recordings', async (req, reply) => {
  const body = req.body as { seed?: string; sessionId?: string; meta?: Record<string, unknown> };
  const seed = body?.seed ?? '0';
  const sessionId = body?.sessionId ?? 'unknown';
  const rec = recorder.start(sessionId, seed, body?.meta);
  Storage.save(rec);
  return reply.code(201).send({ id: rec.id });
});

app.post('/v1/recordings/:id/events', async (req, reply) => {
  const params = req.params as { id: string };
  const rec = Storage.get(params.id);
  if (!rec) {
    return reply.code(404).send({ error: 'recording not found' });
  }
  const body = req.body as
    | { dir: 'in' | 'out'; channel: string; payload: unknown }
    | { events: Array<{ dir: 'in' | 'out'; channel: string; payload: unknown }> };

  const entries = Array.isArray((body as any).events)
    ? ((body as { events: Array<{ dir: 'in' | 'out'; channel: string; payload: unknown }> }).events)
    : [body as { dir: 'in' | 'out'; channel: string; payload: unknown }];

  const accepted = [] as unknown[];
  for (const entry of entries) {
    if (!entry || (entry.dir !== 'in' && entry.dir !== 'out')) {
      return reply.code(400).send({ error: 'invalid dir' });
    }
    const channel = entry.channel as IOChannel;
    if (!['jsonrpc', 'sse', 'stdio', 'net', 'env'].includes(channel)) {
      return reply.code(400).send({ error: 'invalid channel' });
    }
    const event = recorder.push(rec, {
      t: Date.now(),
      dir: entry.dir,
      channel,
      payload: entry.payload
    });
    accepted.push(event);
  }
  Storage.save(rec);
  return reply.code(202).send({ accepted: accepted.length });
});

app.post('/v1/replay/:id', async (req, reply) => {
  const id = (req.params as { id: string }).id;
  const rec = Storage.get(id);
  if (!rec) {
    return reply.code(404).send({ error: 'not found' });
  }
  return reply.send(replayer.replay(rec));
});

app.listen({ port: Number(process.env.PORT || 8081), host: '0.0.0.0' }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
