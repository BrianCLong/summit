import { context } from '../context.js';

describe('Observability Context', () => {
  it('should return undefined when outside context', () => {
    expect(context.get()).toBeUndefined();
    expect(context.getCorrelationId()).toBeUndefined();
  });

  it('should store and retrieve context', () => {
    const ctx = {
      correlationId: 'test-correlation-id',
      tenantId: 'test-tenant',
      requestId: 'test-request',
    };

    context.run(ctx, () => {
      expect(context.get()).toEqual(ctx);
      expect(context.getCorrelationId()).toBe('test-correlation-id');
      expect(context.getTenantId()).toBe('test-tenant');
    });
  });

  it('should isolate contexts', () => {
    const ctx1 = { correlationId: 'id-1' };
    const ctx2 = { correlationId: 'id-2' };

    context.run(ctx1, () => {
      expect(context.getCorrelationId()).toBe('id-1');

      context.run(ctx2, () => {
        expect(context.getCorrelationId()).toBe('id-2');
      });

      expect(context.getCorrelationId()).toBe('id-1');
    });
  });
});
