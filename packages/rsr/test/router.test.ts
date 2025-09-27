import { describe, expect, it, vi } from 'vitest';
import {
  AllowAdapter,
  KAnonymityFilterAdapter,
  RetrievalSafetyRouter,
  SemanticPIIRedactorAdapter,
  TenantScopeLimiterAdapter,
  type PolicyAdapter,
} from '../src/index.js';

const baseContext = {
  tenantId: 'tenant-a',
  query: 'Find incidents in region alpha',
  selectors: ['region:alpha'],
  selectorStats: {
    'region:alpha': 10,
  },
};

describe('RetrievalSafetyRouter', () => {
  it('denies tenants outside the permitted scope', async () => {
    const router = new RetrievalSafetyRouter([
      new TenantScopeLimiterAdapter({ allowedTenants: ['tenant-b'] }),
    ]);

    const decision = await router.route(baseContext);

    expect(decision.action).toBe('deny');
    expect(decision.adapter).toBe('tenant-scope-limiter');
    expect(decision.explanation).toContain('outside the permitted scope');
  });

  it('transforms selectors that violate k-anonymity', async () => {
    const router = new RetrievalSafetyRouter([
      new KAnonymityFilterAdapter({ k: 5 }),
    ], new AllowAdapter());

    const context = {
      ...baseContext,
      selectors: ['region:alpha', 'region:beta'],
      selectorStats: {
        'region:alpha': 10,
        'region:beta': 2,
      },
    };

    const decision = await router.route(context);

    expect(decision.action).toBe('transform');
    expect(decision.sanitizedSelectors).toEqual(['region:alpha']);
  });

  it('redacts queries containing PII-like tokens', async () => {
    const router = new RetrievalSafetyRouter([
      new SemanticPIIRedactorAdapter(),
    ], new AllowAdapter());

    const decision = await router.route({
      ...baseContext,
      query: 'Lookup ssn 123-45-6789 for audit',
    });

    expect(decision.action).toBe('redact');
    expect(decision.redactedQuery).toContain('[REDACTED]');
    expect(decision.metadata?.matches).toContain('123-45-6789');
  });

  it('allows safe queries', async () => {
    const router = new RetrievalSafetyRouter([
      new TenantScopeLimiterAdapter({ allowedTenants: ['tenant-a', 'tenant-b'] }),
      new SemanticPIIRedactorAdapter(),
    ], new AllowAdapter());

    const decision = await router.route(baseContext);

    expect(decision.action).toBe('allow');
    expect(decision.adapter).toBe('allow');
  });

  it('keeps adapters isolated from shared context mutations', async () => {
    class MutatingAdapter extends TenantScopeLimiterAdapter {
      protected override shouldApply() {
        return false;
      }
      protected override apply(): never {
        throw new Error('should not run');
      }
      override async evaluate(context: Parameters<TenantScopeLimiterAdapter['evaluate']>[0]) {
        expect(() => {
          // @ts-expect-error forced mutation attempt
          context.query = 'tampered';
        }).toThrow();
        return null;
      }
    }

    const spy: PolicyAdapter = {
      name: 'spy',
      async evaluate(context) {
        expect(context.query).toBe(baseContext.query);
        return {
          action: 'allow',
          explanation: 'spy allow',
        };
      },
    };

    const router = new RetrievalSafetyRouter([
      new MutatingAdapter({ allowedTenants: ['tenant-a'] }),
      spy,
    ]);

    const decision = await router.route(baseContext);
    expect(decision.adapter).toBe('spy');
  });

  it('stops evaluation after the first matching adapter', async () => {
    const first = {
      name: 'first',
      evaluate: vi.fn(async () => ({
        action: 'deny' as const,
        explanation: 'first hit',
      })),
    } satisfies PolicyAdapter;

    const second = {
      name: 'second',
      evaluate: vi.fn(async () => ({
        action: 'allow' as const,
        explanation: 'should not be reached',
      })),
    } satisfies PolicyAdapter;

    const router = new RetrievalSafetyRouter([first, second]);
    const decision = await router.route(baseContext);

    expect(decision.adapter).toBe('first');
    expect(second.evaluate).not.toHaveBeenCalled();
  });
});
