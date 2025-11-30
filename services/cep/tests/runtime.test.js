import test from 'node:test';
import assert from 'node:assert/strict';
import { RuleRuntime, metadataOnlyEvent } from '../src/core/engine.js';

class MemoryAdapter {
  constructor() {
    this.emitted = [];
    this.keys = new Set();
  }
  remember(key) {
    this.keys.add(key);
  }
  has(key) {
    return this.keys.has(key);
  }
  emit(payload, meta) {
    this.emitted.push({ payload, meta });
  }
}

test('runtime enforces idempotency keys and metadata-only payloads', async () => {
  const kafka = new MemoryAdapter();
  const redis = new MemoryAdapter();
  const runtime = new RuleRuntime({ adapters: { kafka, redis }, clock: () => 1000 });
  const { runId } = runtime.registerRule('AFTER a');
  const event = metadataOnlyEvent({ name: 'a', payload: { field: 'pii', count: 2 } });
  await runtime.evaluate(runId, [event]);
  assert.equal(redis.keys.size, 1);
  assert.equal(kafka.emitted.length, 1);
  assert.equal(kafka.emitted[0].payload.match.events[0].name, 'a');
  assert.deepEqual(event.payload, { count: 2 });
});
