import { buildGraphEventFilter } from '../resolvers/crudResolvers.js';
import type { SubscriptionEnvelope, SubscriptionMetadata } from '../subscriptionEngine.js';

describe('crud subscription predicates', () => {
  const event = (
    metadata: SubscriptionMetadata,
    payload: Record<string, unknown> = {},
  ): SubscriptionEnvelope<Record<string, unknown>> => ({
    id: 'evt-1',
    timestamp: Date.now(),
    payload,
    metadata,
  });

  it('accepts events for the same tenant and investigation', () => {
    const predicate = buildGraphEventFilter(
      { id: 'u1', tenantId: 't-1' },
      'inv-1',
    );

    expect(
      predicate(
        event(
          { tenantId: 't-1', investigationId: 'inv-1', type: 'ENTITY_CREATED' },
          { investigationId: 'inv-1' },
        ),
      ),
    ).toBe(true);
  });

  it('rejects events from other tenants', () => {
    const predicate = buildGraphEventFilter(
      { id: 'u1', tenantId: 't-1' },
      'inv-1',
    );

    expect(
      predicate(
        event({ tenantId: 't-2', investigationId: 'inv-1', type: 'ENTITY_CREATED' }),
      ),
    ).toBe(false);
  });

  it('rejects events when type filter does not match', () => {
    const predicate = buildGraphEventFilter(
      { id: 'u1', tenantId: 't-1' },
      'inv-1',
      ['ENTITY_UPDATED'],
    );

    expect(
      predicate(
        event({ tenantId: 't-1', investigationId: 'inv-1', type: 'ENTITY_CREATED' }),
      ),
    ).toBe(false);
  });
});
