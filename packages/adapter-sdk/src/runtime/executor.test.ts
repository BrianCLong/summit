import { describe, expect, it, vi } from 'vitest';
import type { DlqEvent, DlqPublisher } from './types';

vi.mock('@opentelemetry/api', () => ({
  metrics: {
    getMeter: () => ({
      createHistogram: () => ({ record: () => {} }),
      createCounter: () => ({ add: () => {} }),
    }),
  },
  trace: {
    getTracer: () => ({
      startSpan: () => ({
        setStatus: () => {},
        recordException: () => {},
        end: () => {},
      }),
    }),
  },
  SpanStatusCode: { OK: 1, ERROR: 2 },
}), { virtual: true });

vi.mock('kafkajs', () => ({
  Kafka: class {
    producer() {
      return {
        connect: vi.fn().mockResolvedValue(undefined),
        send: vi.fn().mockResolvedValue(undefined),
        disconnect: vi.fn().mockResolvedValue(undefined),
      };
    }
  },
}), { virtual: true });

vi.mock('pino', () => ({
  default: () => ({
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
  }),
}), { virtual: true });

import { AdapterExecutor } from './executor';

class StubDlqPublisher implements DlqPublisher {
  public events: DlqEvent[] = [];

  async publish(event: DlqEvent): Promise<void> {
    this.events.push(event);
  }
}

describe('AdapterExecutor', () => {
  it('retries retryable failures and succeeds', async () => {
    const dlq = new StubDlqPublisher();
    const executor = new AdapterExecutor({
      retryPolicy: {
        maxAttempts: 2,
        initialDelayMs: 1,
        maxDelayMs: 2,
        backoffMultiplier: 1,
      },
      dlqPublisher: dlq,
      defaultTimeoutMs: 50,
    });

    const handler = vi
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error('transient'), { code: 'ECONNRESET' }))
      .mockResolvedValueOnce('ok');

    const result = await executor.execute({
      adapterId: 'adapter-1',
      operation: 'ping',
      execute: handler,
    });

    expect(result.success).toBe(true);
    expect(result.attempts).toBe(2);
    expect(dlq.events).toHaveLength(0);
  });

  it('uses idempotency cache for repeated keys', async () => {
    const executor = new AdapterExecutor({ idempotencyTtlMs: 10_000 });
    const handler = vi.fn().mockResolvedValue('once');

    const first = await executor.execute({
      adapterId: 'adapter-1',
      operation: 'dedupe',
      execute: handler,
      idempotencyKey: 'key-1',
    });

    const second = await executor.execute({
      adapterId: 'adapter-1',
      operation: 'dedupe',
      execute: handler,
      idempotencyKey: 'key-1',
    });

    expect(first.success).toBe(true);
    expect(second.fromCache).toBe(true);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('opens the circuit after repeated failures', async () => {
    const dlq = new StubDlqPublisher();
    const executor = new AdapterExecutor({
      circuitBreaker: { failureThreshold: 1, resetTimeoutMs: 10_000, halfOpenMaxSuccesses: 1 },
      dlqPublisher: dlq,
    });

    const failing = vi.fn().mockRejectedValue(new Error('hard-fail'));
    const first = await executor.execute({
      adapterId: 'adapter-1',
      operation: 'fail',
      execute: failing,
    });

    expect(first.success).toBe(false);

    const blocked = await executor.execute({
      adapterId: 'adapter-1',
      operation: 'fail',
      execute: failing,
    });

    expect(blocked.success).toBe(false);
    expect(blocked.attempts).toBe(0);
    expect(dlq.events.length).toBeGreaterThan(0);
  });

  it('denies egress when target host is not allowlisted', async () => {
    const executor = new AdapterExecutor();
    const handler = vi.fn().mockResolvedValue('ok');

    const result = await executor.execute({
      adapterId: 'adapter-1',
      operation: 'http-call',
      execute: handler,
      target: 'https://example.com/resource',
    });

    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('Network egress denied');
    expect(handler).not.toHaveBeenCalled();
  });
});
