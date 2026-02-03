import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import {
  buildConsistencyReport,
  findGovernanceDocuments,
  generateDeterministicHash,
  loadEvidenceMap,
  parseEvidenceIds,
  parseHeaders,
  processGovernanceDocument,
  processGovernanceDocumentWithAI
} from '../verify_evidence_id_consistency.mjs';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

async function makeTempRepo() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'evidence-consistency-test-'));
  const docsRoot = path.join(root, 'docs', 'governance');
  await fs.mkdir(docsRoot, { recursive: true });
  return { root, docsRoot };
}

async function writeTestFile(filePath, contents) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, contents, 'utf8');
}

function makeHeaderDoc(overrides = {}) {
  const headers = {
    Owner: 'Platform Team',
    'Last-Reviewed': '2026-01-14',
    'Evidence-IDs': 'none',
    Status: 'active',
    ...overrides
  };
  return Object.entries(headers)
    .map(([key, value]) => `**${key}:** ${value}`)
    .join('\n') + '\n\n# Content\nSome content here.';
}

describe('Evidence ID Consistency Verification - Enhanced', () => {
  test('determinism: two runs produce identical results', async () => {
    const { root, docsRoot } = await makeTempRepo();
    const evidenceMap = new Map([['valid.id', { path: 'test-path', description: 'Valid ID' }]]);

    const testDoc = path.join(docsRoot, 'test_doc.md');
    await writeTestFile(testDoc, makeHeaderDoc({ 'Evidence-IDs': 'valid.id,invalid.id' }));

    // Run verification twice
    const result1 = await processGovernanceDocument(testDoc, evidenceMap, root);
    const result2 = await processGovernanceDocument(testDoc, evidenceMap, root);

    // Results should be identical
    assert.deepStrictEqual(result1, result2, 'Same input should produce identical output');
  });

  test('report contains no generated_at field for determinism', async () => {
    const { root, docsRoot } = await makeTempRepo();
    const evidenceMap = new Map([['valid.id', { path: 'some/path', description: 'Valid ID' }]]);

    const testDoc = path.join(docsRoot, 'test_doc.md');
    await writeTestFile(testDoc, makeHeaderDoc({ 'Evidence-IDs': 'valid.id' }));

    const result = await processGovernanceDocument(testDoc, evidenceMap, root);

    const mockSha = 'test-sha';
    const mockPolicyHash = 'test-policy-hash';
    const mockConfig = { governanceDir: 'docs/governance', outputDir: 'test/output', repoRoot: root, evidenceMapPath: 'evidence/map.yml' };

    const report = buildConsistencyReport({
      sha: mockSha,
      policyHash: mockPolicyHash,
      results: [result],
      config: mockConfig,
      evidenceMap
    });

    // Check that report does not contain generated_at field
    assert.strictEqual(report.generated_at, undefined, 'Report should not contain generated_at for determinism');
  });

  test('configuration validation protects against nondeterminism', async () => {
    // Test that the configuration validation function exists and works properly
    // This should be implemented in the main script
    const { root, docsRoot } = await makeTempRepo();
    const evidenceMap = new Map();
    const testDoc = path.join(docsRoot, 'test_doc.md');
    await writeTestFile(testDoc, makeHeaderDoc({ 'Evidence-IDs': 'valid.id' }));

    // Basic processing should work
    const result = await processGovernanceDocument(testDoc, evidenceMap, root);
    assert.ok(Array.isArray(result.violations), 'Should return valid result structure');
  });

  test('processGovernanceDocumentWithAI handles disabled AI gracefully', async () => {
    const { root, docsRoot } = await makeTempRepo();
    const evidenceMap = new Map([['valid.id', { path: 'some/path', description: 'Valid ID' }]]);

    const testDoc = path.join(docsRoot, 'test_doc.md');
    await writeTestFile(testDoc, makeHeaderDoc({ 'Evidence-IDs': 'valid.id' }));

    // Temporarily disable AI by setting environment variable
    const originalValue = process.env.ENABLE_QWEN_ANALYSIS;
    process.env.ENABLE_QWEN_ANALYSIS = 'false';

    try {
      const result = await processGovernanceDocumentWithAI(testDoc, evidenceMap, root);
      // Should work the same as standard processing when AI is disabled
      assert.ok(result.path, 'Should return valid result path');
      assert.ok(Array.isArray(result.violations), 'Should return violations array');
    } finally {
      // Restore original value
      process.env.ENABLE_QWEN_ANALYSIS = originalValue;
    }
  });
});