import { formatLogEvent, redactSensitive } from '../logEventFormatter.js';
import type { LogLevel } from '../logEventBus.js';

describe('formatLogEvent', () => {
  it('formats message and correlation metadata safely', () => {
    const args = [
      { message: 'hello', correlationId: 'corr-1', tenantId: 'tenant-1', token: 'secret-token' },
      { traceId: 'trace-1', spanId: 'span-1' },
    ];

    const event = formatLogEvent('info' as LogLevel, args);

    expect(event.message).toBe('hello');
    expect(event.correlationId).toBe('corr-1');
    expect(event.traceId).toBe('trace-1');
    expect(event.spanId).toBe('span-1');
    expect(event.context).not.toHaveProperty('token');
  });

  it('handles request and response-like objects without leaking headers', () => {
    const request = { method: 'GET', url: '/health', headers: { 'x-request-id': 'req-123', authorization: 'Bearer abc' }, socket: { remoteAddress: '127.0.0.1' } };
    const response = { statusCode: 200, getHeader: (key: string) => (key === 'content-length' ? 123 : undefined) };

    const event = formatLogEvent('info' as LogLevel, [request, response]);

    expect(event.context).toMatchObject({
      req: { id: 'req-123', method: 'GET', url: '/health', remoteAddress: '127.0.0.1' },
      res: { statusCode: 200, contentLength: 123 },
    });
    expect(event.message).toBe('log');
  });
});

describe('redactSensitive', () => {
  it('removes sensitive keys recursively', () => {
    const value = {
      password: 'secret',
      nested: {
        token: 'should-not-appear',
        safe: 'ok',
      },
      list: [{ apiKey: 'nope' }, { value: 'keep' }],
    };

    expect(redactSensitive(value)).toEqual({ nested: { safe: 'ok' }, list: [{}, { value: 'keep' }] });
  });
});
