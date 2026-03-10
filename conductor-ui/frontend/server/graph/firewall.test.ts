import { test } from 'node:test';
import assert from 'node:assert';
import { GraphQueryFirewall } from './firewall';

test('GraphQueryFirewall', async (t) => {
  const mockContext = {
    userId: 'user1',
    tenantId: 'tenant1',
    role: 'analyst',
    classification: 'SECRET',
    purpose: 'analysis'
  };

  const firewall = new GraphQueryFirewall();

  await t.test('should allow a valid, safe query with correct tenant ID', async () => {
    const query = `MATCH (n:Person) WHERE tenant_id = 'tenant1' RETURN n LIMIT 10`;
    const result = await firewall.evaluateQuery(query, mockContext);

    assert.strictEqual(result.allowed, true);
    assert.strictEqual(result.sanitizedQuery, query);
  });

  await t.test('should deny query missing tenant filter', async () => {
    const query = `MATCH (n:Person) RETURN n`;
    const result = await firewall.evaluateQuery(query, mockContext);

    assert.strictEqual(result.allowed, false);
    assert.ok(result.reason?.includes('tenant_filter_required'));
  });

  await t.test('should deny query with wrong tenant ID', async () => {
    const query = `MATCH (n:Person) WHERE tenant_id = 'tenant2' RETURN n`;
    const result = await firewall.evaluateQuery(query, mockContext);

    assert.strictEqual(result.allowed, false);
    assert.ok(result.reason?.includes('tenant_mismatch'));
  });

  await t.test('should deny anomalous cartesian product', async () => {
    const query = `MATCH (a), (b) RETURN a, b`;
    const result = await firewall.evaluateQuery(query, mockContext);

    assert.strictEqual(result.allowed, false);
    assert.ok(result.reason?.includes('Anomalous traversal pattern detected'));
  });

  await t.test('should deny suspicious unbounded traversals (CEP Guard)', async () => {
    const query = `MATCH p=(a)-[*]-(b) WHERE tenant_id = 'tenant1' RETURN p`;
    const result = await firewall.evaluateQuery(query, mockContext);

    assert.strictEqual(result.allowed, false);
    assert.ok(result.reason?.includes('Suspicious unbounded traversal pattern (CEP guard)'));
  });

  await t.test('should deny overly long variable length paths', async () => {
    const query = `MATCH p=(a)-[*1..20]-(b) WHERE tenant_id = 'tenant1' RETURN p`;
    const result = await firewall.evaluateQuery(query, mockContext);

    assert.strictEqual(result.allowed, false);
    assert.ok(result.reason?.includes('Suspicious unbounded traversal pattern (CEP guard)'));
  });

  await t.test('should evaluate purpose policies', async () => {
    const query = `MATCH (n:Person) WHERE tenant_id = 'tenant1' SET n.status = 'active'`;
    const ctx = { ...mockContext, purpose: 'read-only' };
    const result = await firewall.evaluateQuery(query, ctx);

    assert.strictEqual(result.allowed, false);
    assert.ok(result.reason?.includes('Policy violation'));
  });

  await t.test('should evaluate classification policies', async () => {
    const query = `MATCH (n:Document {classification: "TS/SCI"}) WHERE tenant_id = 'tenant1' RETURN n`;
    const ctx = { ...mockContext, classification: 'SECRET' };
    const result = await firewall.evaluateQuery(query, ctx);

    assert.strictEqual(result.allowed, false);
    assert.ok(result.reason?.includes('Policy violation'));
  });
});
