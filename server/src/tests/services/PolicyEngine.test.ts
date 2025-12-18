import { PolicyEngine } from '../../services/PolicyEngine.js';
import { describe, it, expect, beforeAll } from '@jest/globals';

describe('PolicyEngine', () => {
  let engine: PolicyEngine;

  beforeAll(async () => {
    engine = PolicyEngine.getInstance();
    await engine.initialize();
  });

  it('should allow admin users', async () => {
    const decision = await engine.evaluate({
      environment: 'prod',
      user: { id: 'u1', role: 'admin', permissions: [], tenantId: 't1' },
      action: 'delete_db',
      resource: { type: 'database' }
    });
    expect(decision.allow).toBe(true);
    expect(decision.reason).toBe('Admin bypass');
  });

  it('should block TOP_SECRET access for low clearance', async () => {
    const decision = await engine.evaluate({
      environment: 'prod',
      user: { id: 'u2', role: 'user', permissions: [], clearance_level: 1, tenantId: 't1' },
      action: 'read',
      resource: { type: 'document', sensitivity: 'TOP_SECRET' }
    });
    expect(decision.allow).toBe(false);
    expect(decision.reason).toContain('Insufficient clearance');
  });

  it('should detect PII in copilot query', async () => {
     const decision = await engine.evaluate({
      environment: 'prod',
      user: { id: 'u3', role: 'user', permissions: ['copilot_query'], tenantId: 't1' },
      action: 'copilot_query',
      resource: { type: 'prompt', query: 'Show me the SSN for user X' }
    });
    expect(decision.allow).toBe(false);
    expect(decision.reason).toContain('PII detected');
  });
});
