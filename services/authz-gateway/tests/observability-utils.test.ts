import { describe, expect, it, jest } from '@jest/globals';
import {
  trace,
  TraceFlags,
  type SpanAttributes,
  type Span,
} from '@opentelemetry/api';
import {
  annotateActiveSpan,
  buildLogContext,
  recordGraphqlDuration,
  recordIngestEvent,
} from '../src/observability';

describe('observability helpers', () => {
  it('provides default tenant in log context', () => {
    expect(buildLogContext('  ')).toMatchObject({ tenant: 'unknown' });
  });

  it('annotates the active span with service attributes', () => {
    const spanContext = {
      traceId: 'fedcba9876543210fedcba9876543210',
      spanId: '0123456789abcdef',
      traceFlags: TraceFlags.SAMPLED,
      isRemote: false,
    } as const;
    const seen: SpanAttributes[] = [];
    const fakeSpan = {
      spanContext: () => spanContext,
      setAttribute() {
        return this;
      },
      setAttributes(attributes: SpanAttributes) {
        seen.push(attributes);
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
    annotateActiveSpan('tenant-span', { 'test.key': 'value' });
    expect(seen.length).toBeGreaterThan(0);
    getActiveSpan.mockRestore();
  });

  it('records metrics for undefined inputs', () => {
    recordGraphqlDuration(100, undefined, undefined);
    recordIngestEvent(undefined, '');
  });
});
