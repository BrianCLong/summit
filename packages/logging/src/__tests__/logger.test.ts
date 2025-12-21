import { Writable } from 'node:stream';

import { context, trace } from '@opentelemetry/api';

import { bindLogContext, createLogger } from '../index.js';

class MemoryStream extends Writable {
  public chunks: string[] = [];

  _write(chunk: any, _encoding: BufferEncoding, callback: (error?: Error | null) => void): void {
    this.chunks.push(chunk.toString());
    callback();
  }
}

describe('logging adapter', () => {
  it('enriches logs with trace context and bound request metadata', () => {
    const stream = new MemoryStream();
    const logger = createLogger({ destination: stream, level: 'info' });
    const tracer = trace.getTracer('test');
    const span = tracer.startSpan('test-span');

    context.with(trace.setSpan(context.active(), span), () => {
      bindLogContext({ userId: 'user-123', correlationId: 'corr-abc' }, () => {
        logger.info({ event: 'test-event' }, 'hello');
      });
    });

    span.end();

    expect(stream.chunks.length).toBe(1);
    const payload = JSON.parse(stream.chunks[0]);
    expect(payload.traceId).toBeDefined();
    expect(payload.spanId).toBeDefined();
    expect(payload.userId).toBe('user-123');
    expect(payload.correlationId).toBe('corr-abc');
    expect(payload.msg).toBe('hello');
  });

  it('redacts sensitive fields before emitting', () => {
    const stream = new MemoryStream();
    const logger = createLogger({ destination: stream, redactKeys: ['sensitive'] });

    logger.info({ actor: 'alice', sensitive: 'secret-token' }, 'redaction-check');

    const payload = JSON.parse(stream.chunks[0]);
    expect(payload.actor).toBe('alice');
    expect(payload.sensitive).toBeUndefined();
  });

  it('samples noisy logs according to level budgets', () => {
    const stream = new MemoryStream();
    const logger = createLogger({
      destination: stream,
      sampleRates: { debug: 0 },
    });

    const originalRandom = Math.random;
    Math.random = () => 0.95;
    logger.debug({ component: 'noisy' }, 'sample-me');
    Math.random = () => 0.01;
    logger.debug({ component: 'noisy' }, 'accept-me');
    Math.random = originalRandom;

    expect(stream.chunks.length).toBe(1);
    const payload = JSON.parse(stream.chunks[0]);
    expect(payload.msg).toBe('accept-me');
    expect(payload.component).toBe('noisy');
  });
});
