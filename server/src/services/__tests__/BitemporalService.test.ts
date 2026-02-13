import { describe, it, expect, beforeAll } from '@jest/globals';
import { bitemporalService } from '../BitemporalService.js';

// Mock DB connection if needed or assume integration test setup handled globally
// Given the error was type error in service code, we just fix inputs here.

describe('Bitemporal Service (Task #109)', () => {
  const tenantId = 'test-tenant';
  const entityId = 'target-entity-123';

  it('should record a fact and allow point-in-time retrieval', async () => {
    const validFrom = new Date('2026-01-01T00:00:00Z');
    
    await bitemporalService.recordFact({
      id: entityId,
      tenantId,
      kind: 'Person',
      props: { name: 'John Doe', status: 'Active' },
      validFrom: validFrom, // Pass Date object
      createdBy: 'test-user'
    });

    // 1. Query as of today (should find it)
    const current = await bitemporalService.queryAsOf(entityId, tenantId);
    expect(current).toBeDefined();
    expect(current?.props.name).toBe('John Doe');

    // 2. Query as of 2025 (should NOT find it, as it wasn't valid yet)
    const pastValid = await bitemporalService.queryAsOf(entityId, tenantId, new Date('2025-01-01T00:00:00Z'));
    expect(pastValid).toBeNull();
  });

  it('should support system correction (transaction time travel)', async () => {
    const validFrom = new Date('2026-01-01T00:00:00Z');
    const transactionBeforeCorrection = new Date();

    // Small delay to ensure timestamp separation
    await new Promise(r => setTimeout(r, 100));

    // Record a correction (e.g. name was actually Jane)
    await bitemporalService.recordFact({
      id: entityId,
      tenantId,
      kind: 'Person',
      props: { name: 'Jane Doe', status: 'Active' },
      validFrom: validFrom, // Pass Date object
      createdBy: 'corrector'
    });

    // 1. Current view (Jane)
    const current = await bitemporalService.queryAsOf(entityId, tenantId);
    expect(current?.props.name).toBe('Jane Doe');

    // 2. View as of what we knew BEFORE correction (John)
    const whatWeKnewThen = await bitemporalService.queryAsOf(
        entityId, 
        tenantId, 
        new Date(), 
        transactionBeforeCorrection
    );
    expect(whatWeKnewThen?.props.name).toBe('John Doe');
  });
});
