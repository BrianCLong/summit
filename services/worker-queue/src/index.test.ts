import { describe, expect, it, vi } from '@jest/globals';
import { processPayload } from './index.js';
import { queueProcessed } from '../../../libs/ops/src/metrics-queue.js';

class MockRedis {
  data: Record<string, Record<string, string>> = {};
  async hset(key: string, value: Record<string, string>): Promise<void> {
    this.data[key] = { ...(this.data[key] ?? {}), ...value };
  }
  async expire(_key: string, _seconds: number): Promise<number> {
    return 1;
  }
}

describe('worker handlers', () => {
  it('processes OCR payload and records success', async () => {
    const ctx = { redis: new MockRedis() as unknown as any };
    const incSpy = vi.spyOn(queueProcessed, 'inc');
    const sample = Buffer.from('hello world').toString('base64');
    await processPayload(JSON.stringify({ id: '1', type: 'OCR', payload: { content: sample } }), ctx);

    expect(ctx.redis.data['job:result:1'].status).toBe('completed');
    expect(incSpy).toHaveBeenCalledWith({ status: 'success', type: 'OCR' });
    incSpy.mockRestore();
  });

  it('records failure for unknown type', async () => {
    const ctx = { redis: new MockRedis() as unknown as any };
    const incSpy = vi.spyOn(queueProcessed, 'inc');

    await expect(
      processPayload(JSON.stringify({ id: '2', type: 'UNKNOWN', payload: {} }), ctx)
    ).rejects.toThrow('unhandled_job_type:UNKNOWN');

    expect(ctx.redis.data['job:result:2'].status).toBe('failed');
    expect(incSpy).toHaveBeenCalledWith({ status: 'failure', type: 'UNKNOWN' });
    incSpy.mockRestore();
  });
});
