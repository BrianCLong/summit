import { PassThrough } from 'stream';
import { formatSseEvent, SseEmitter } from '../../mcp/summit_server/src/transports/sse.js';

describe('sse transport', () => {
  it('preserves event ordering', async () => {
    const output = new PassThrough();
    const emitter = new SseEmitter(output, 1024);

    await emitter.send({ event: 'first', data: 'one' });
    await emitter.send({ event: 'second', data: 'two' });

    const payload = output.read()?.toString('utf-8') ?? '';
    expect(payload).toContain('event: first');
    expect(payload).toContain('event: second');
    expect(payload.indexOf('event: first')).toBeLessThan(
      payload.indexOf('event: second'),
    );
  });

  it('enforces max bytes per event', async () => {
    const output = new PassThrough();
    const emitter = new SseEmitter(output, 16);

    await expect(
      emitter.send({ event: 'overflow', data: '01234567890123456789' }),
    ).rejects.toThrow('SSE event exceeds max bytes per event');
  });

  it('formats SSE events consistently', () => {
    const formatted = formatSseEvent({ event: 'ping', data: 'ok' });
    expect(formatted).toBe('event: ping\ndata: ok\n\n');
  });
});
