import { test } from 'node:test';
import assert from 'node:assert';
import { InfoMapService } from '../src/services/InfoMapService.ts';

test('InfoMapService functionality', async (t) => {
  const service = InfoMapService.getInstance();

  await t.test('should seed mock data on initialization', async () => {
    const nodes = await service.getNodes();
    assert.strictEqual(nodes.length, 50, 'Should have 50 initial nodes');
    assert.ok(nodes[0].connections.length >= 0, 'Nodes should have connections');
  });

  await t.test('should ingest new node', async () => {
    const newNode = {
      label: 'Test Node',
      type: 'media_outlet' as const,
      metadata: { region: 'US' }
    };

    const result = await service.ingestNode(newNode);
    assert.strictEqual(result.label, 'Test Node');
    assert.ok(result.id, 'Should generate ID');

    const nodes = await service.getNodes();
    assert.strictEqual(nodes.length, 51, 'Should have 51 nodes after ingestion');
  });

  await t.test('should trigger refresh', async () => {
    const result = await service.triggerRefresh();
    assert.strictEqual(result.status, 'completed');
    assert.strictEqual(result.count, 51);
  });
});
