import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { trace, TraceFlags, type Span } from '@opentelemetry/api';
import * as fs from 'fs';
import { log } from '../src/audit';
import * as observability from '../src/observability';

jest.mock('fs', () => {
  const actual = jest.requireActual('fs') as Record<string, unknown>;
  return Object.assign({}, actual, { appendFileSync: jest.fn() });
});

describe('audit logging', () => {
  let ingestSpy: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    (fs.appendFileSync as unknown as jest.Mock).mockReset();
    ingestSpy = jest
      .spyOn(observability, 'recordIngestEvent')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    ingestSpy.mockRestore();
  });

  it('writes audit record with trace context and decision', () => {
    const spanContext = {
      traceId: '1234567890abcdef1234567890abcdef',
      spanId: 'abcdef1234567890',
      traceFlags: TraceFlags.SAMPLED,
      isRemote: false,
    } as const;

    const fakeSpan = {
      spanContext: () => spanContext,
      setAttribute() {
        return this;
      },
      setAttributes() {
        return this;
      },
      addEvent() {
        return this;
      },
      addLink() {
        return this;
      },
      addLinks() {
        return this;
      },
      setStatus() {
        return this;
      },
      updateName() {
        return this;
      },
      end() {
        return undefined;
      },
      isRecording: () => true,
      recordException() {
        return undefined;
      },
    } as unknown as Span;

    const getActiveSpan = jest
      .spyOn(trace, 'getActiveSpan')
      .mockReturnValue(fakeSpan);
    log({
      subject: 'alice',
      action: 'read',
      resource: 'self',
      tenantId: 'tenantZ',
      allowed: true,
      reason: 'allow',
    });
    const appendMock = fs.appendFileSync as unknown as jest.Mock;
    expect(appendMock).toHaveBeenCalled();
    const payload = appendMock.mock.calls[0][1] as string;
    const record = JSON.parse(payload.trim());
    expect(record.decision).toBe('allow');
    expect(record.tenantId).toBe('tenantZ');
    expect(record.traceId).toBe(spanContext.traceId);
    expect(record.spanId).toBe(spanContext.spanId);
    expect(ingestSpy).toHaveBeenCalledWith('tenantZ', 'allow');
    getActiveSpan.mockRestore();
  });
});
