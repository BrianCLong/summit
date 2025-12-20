import { describe, it, expect, vi } from 'vitest';
import { SwitchboardRouter, defineRoute } from './router';
import { z } from 'zod';

describe('SwitchboardRouter', () => {
  it('should dispatch a registered route successfully', async () => {
    const router = new SwitchboardRouter();
    const handler = vi.fn().mockResolvedValue({ success: true });

    const route = defineRoute({
      id: 'test.route',
      description: 'Test Route',
      source: 'client',
      targetService: 'other',
      inputSchema: z.object({ val: z.number() }),
      outputSchema: z.object({ success: z.boolean() }),
      handler,
    });

    router.register(route);

    const context = { requestId: '1', source: 'client' as const };
    const result = await router.dispatch('test.route', { val: 123 }, context);

    expect(result).toEqual({ success: true });
    expect(handler).toHaveBeenCalledWith({ val: 123 }, context);
  });

  it('should fail on invalid input', async () => {
    const router = new SwitchboardRouter();
    const route = defineRoute({
      id: 'test.route',
      description: 'Test Route',
      source: 'client',
      targetService: 'other',
      inputSchema: z.object({ val: z.number() }),
      outputSchema: z.any(),
      handler: async () => ({}),
    });
    router.register(route);

    const context = { requestId: '1', source: 'client' as const };
    await expect(router.dispatch('test.route', { val: 'not-a-number' }, context))
      .rejects.toThrow('Invalid input');
  });

  it('should retry on failure', async () => {
    const router = new SwitchboardRouter({ defaultRetries: 2 });
    const handler = vi.fn()
      .mockRejectedValueOnce(new Error('Fail 1'))
      .mockRejectedValueOnce(new Error('Fail 2'))
      .mockResolvedValue({ success: true });

    const route = defineRoute({
      id: 'test.retry',
      description: 'Retry Route',
      source: 'client',
      targetService: 'other',
      inputSchema: z.any(),
      outputSchema: z.any(),
      handler,
    });
    router.register(route);

    const context = { requestId: '1', source: 'client' as const };
    const result = await router.dispatch('test.retry', {}, context);

    expect(result).toEqual({ success: true });
    expect(handler).toHaveBeenCalledTimes(3);
  });

  it('should timeout if handler takes too long', async () => {
    const router = new SwitchboardRouter({ defaultTimeout: 50 });
    const handler = vi.fn().mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
      return { success: true };
    });

    const route = defineRoute({
      id: 'test.timeout',
      description: 'Timeout Route',
      source: 'client',
      targetService: 'other',
      inputSchema: z.any(),
      outputSchema: z.any(),
      handler,
    });
    router.register(route);

    const context = { requestId: '1', source: 'client' as const };
    await expect(router.dispatch('test.timeout', {}, context))
      .rejects.toThrow('timed out');
  }, 1000); // Increase test timeout for this specific test
});
