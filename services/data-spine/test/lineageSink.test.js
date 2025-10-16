const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { LineageSink } = require('../src/lineageSink');

test('persists lineage events and tracks drop rate', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lineage-'));
  const outputPath = path.join(tmp, 'graph.json');
  const sink = new LineageSink({ outputPath });
  const event = {
    contract: 'customer-profile',
    version: '1.1.0',
    action: 'ingest',
    who: 'pipeline-user',
    when: new Date().toISOString(),
    where: 's3://prod-bucket',
    why: 'daily-upsert',
    checksum: 'abc123',
  };
  sink.record(event);
  const stored = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
  assert.ok(Object.values(stored.nodes).length >= 3);
  assert.strictEqual(stored.edges.length, 1);
  assert.ok(sink.getDropRate() < 0.01);
});
