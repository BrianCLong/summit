import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { buildReceipt, computePipelineIdentity, diffReceipts, formatReceiptDiff } from '../src/index.js';

const baseManifest = {
  name: 'sample pipeline',
  version: '1.0.0',
  toolchain: {
    compilers: [
      { name: 'gcc', version: '12.2', path: '/usr/bin/gcc' },
      { name: 'nvcc', version: '12.3', path: '/usr/local/cuda/bin/nvcc' }
    ],
    libraries: [
      { name: 'cublas', version: '12.3' },
      { name: 'glibc', version: '2.35' }
    ],
    cuda: { version: '12.3', driver: '535.86' },
    drivers: [{ name: 'nvidia', version: '535.86' }]
  },
  executionGraph: {
    nodes: [
      { id: 'preprocess', type: 'container', image: 'alpine:3.19' },
      { id: 'train', type: 'container', image: 'pytorch:2.3' }
    ],
    edges: [
      { from: 'preprocess', to: 'train', artifact: 'dataset' }
    ]
  },
  metadata: {
    owner: 'ml-team'
  }
};

function makeReceipt(manifest, rawSeed) {
  const identity = computePipelineIdentity(manifest);
  const manifestRawHash = createHash('sha256').update(rawSeed).digest('hex');
  return {
    identity,
    receipt: buildReceipt({
      manifest,
      manifestPath: '/tmp/manifest.yaml',
      manifestFormat: 'yaml',
      manifestRawHash,
      normalized: identity.normalized,
      componentDigests: identity.componentDigests,
      canonicalManifestHash: identity.canonicalManifestHash,
      pipelineId: identity.id,
      algorithm: identity.algorithm,
      stats: { size: rawSeed.length, mtime: new Date('2024-01-01T00:00:00Z') }
    })
  };
}

test('stable pipeline ID for equivalent manifests', () => {
  const shuffledManifest = {
    ...baseManifest,
    toolchain: {
      ...baseManifest.toolchain,
      compilers: [...baseManifest.toolchain.compilers].reverse(),
      libraries: [...baseManifest.toolchain.libraries].reverse()
    },
    executionGraph: {
      ...baseManifest.executionGraph,
      nodes: [...baseManifest.executionGraph.nodes].reverse()
    }
  };
  const first = computePipelineIdentity(baseManifest);
  const second = computePipelineIdentity(shuffledManifest);
  assert.equal(first.id, second.id, 'IDs should be identical for equivalent manifests');
  assert.deepEqual(first.normalized, second.normalized);
});

test('receipt integrates with registry-friendly metadata', () => {
  const { identity, receipt } = makeReceipt(baseManifest, 'manifest-a');
  assert.equal(receipt.pipeline.id, identity.id);
  assert.ok(receipt.integrations.dpec.pipelineId);
  assert.ok(receipt.integrations.spar.pipelineId);
  assert.equal(receipt.summary.toolchain.byType.compilers, 2);
  assert.equal(receipt.summary.executionGraph.nodes, 2);
});

test('diff pinpoints toolchain and graph changes', () => {
  const { receipt: baselineReceipt } = makeReceipt(baseManifest, 'manifest-b');
  const updatedManifest = JSON.parse(JSON.stringify(baseManifest));
  updatedManifest.toolchain.libraries[0].version = '12.4';
  updatedManifest.executionGraph.nodes.push({ id: 'evaluate', type: 'container', image: 'alpine:3.19' });
  updatedManifest.executionGraph.edges.push({ from: 'train', to: 'evaluate', artifact: 'model' });
  const { receipt: updatedReceipt } = makeReceipt(updatedManifest, 'manifest-c');
  const diff = diffReceipts(baselineReceipt, updatedReceipt);
  assert.ok(diff.hasDifferences, 'diff should detect changes');
  const libraryChange = diff.toolchain.find((change) => change.section === 'libraries' && change.type === 'changed');
  assert.ok(libraryChange, 'library change should be reported');
  const addedNode = diff.executionGraph.find((change) => change.section === 'nodes' && change.type === 'added');
  assert.ok(addedNode, 'new node should be detected');
  const report = formatReceiptDiff(diff);
  assert.match(report, /Pipeline ID changed/);
  assert.match(report, /libraries/);
  assert.match(report, /nodes/);
});

test('diff reports no differences for identical receipts', () => {
  const { receipt: firstReceipt } = makeReceipt(baseManifest, 'manifest-d');
  const { receipt: secondReceipt } = makeReceipt(baseManifest, 'manifest-d');
  const diff = diffReceipts(firstReceipt, secondReceipt);
  assert.equal(diff.hasDifferences, false);
  const report = formatReceiptDiff(diff);
  assert.match(report, /No differences detected/);
});
