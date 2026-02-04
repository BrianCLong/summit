import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test, describe } from 'node:test';
import {
  buildConsistencyReport,
  findGovernanceDocuments,
  generateDeterministicHash,
  loadEvidenceMap,
  parseEvidenceIds,
  parseHeaders,
  processGovernanceDocument,
  writeReports
} from '../verify_evidence_id_consistency.mjs';

function makeTempRepo() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'evidence-consistency-test-'));
  const docsRoot = path.join(root, 'docs', 'governance');
  fs.mkdirSync(docsRoot, { recursive: true });
  return { root, docsRoot };
}

function writeTestFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
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

describe('Evidence ID Consistency Verification', () => {
  test('parseEvidenceIds handles various formats', () => {
    assert.deepEqual(parseEvidenceIds('id1'), ['id1']);
    assert.deepEqual(parseEvidenceIds('id1,id2'), ['id1', 'id2']);
    assert.deepEqual(parseEvidenceIds(' id1 , id2 '), ['id1', 'id2']);
    assert.deepEqual(parseEvidenceIds(''), []);
    assert.deepEqual(parseEvidenceIds('none'), ['none']);
    assert.deepEqual(parseEvidenceIds('id.with.dots,id-with-dashes,id_with_underscores'), 
                     ['id.with.dots', 'id-with-dashes', 'id_with_underscores']);
  });

  test('parseHeaders extracts evidence IDs correctly', () => {
    const content = `**Owner:** Team
**Last-Reviewed:** 2026-01-14
**Evidence-IDs:** id1,id2
**Status:** active

Content`;
    const headers = parseHeaders(content);
    assert.equal(headers['Evidence-IDs'], 'id1,id2');
  });

  test('buildConsistencyReport generates consistent output', () => {
    const resultsA = [
      { path: 'b.md', violations: [{ type: 'error', message: 'problem' }], evidence_ids: ['id1'] },
      { path: 'a.md', violations: [], evidence_ids: [] }
    ];
    const resultsB = [
      { path: 'a.md', violations: [], evidence_ids: [] },
      { path: 'b.md', violations: [{ type: 'error', message: 'problem' }], evidence_ids: ['id1'] }
    ];

    const reportA = buildConsistencyReport({ sha: 'abc', policyHash: 'hash', results: resultsA, config: {} });
    const reportB = buildConsistencyReport({ sha: 'abc', policyHash: 'hash', results: resultsB, config: {} });

    // Reports should have same structure despite different input order
    assert.deepEqual(reportA.results.map(r => r.path), ['a.md', 'b.md']);
    assert.deepEqual(reportB.results.map(r => r.path), ['a.md', 'b.md']);
  });

  test('generateDeterministicHash produces consistent output', () => {
    const obj1 = { b: 2, a: 1 };
    const obj2 = { a: 1, b: 2 };
    
    const hash1 = generateDeterministicHash(obj1);
    const hash2 = generateDeterministicHash(obj2);
    
    assert.equal(hash1, hash2);
  });

  test('processGovernanceDocument validates evidence ID format', async () => {
    const { root, docsRoot } = makeTempRepo();
    const mapPath = path.join(root, 'evidence', 'map.yml');
    fs.mkdirSync(path.dirname(mapPath), { recursive: true });
    fs.writeFileSync(mapPath, 'valid.id.format:\n  path: "some/path"\n  description: "Valid ID"\n');

    const evidenceMap = await loadEvidenceMap(mapPath);
    const testDocPath = path.join(docsRoot, 'test.md');
    writeTestFile(testDocPath, makeHeaderDoc({ 'Evidence-IDs': 'valid.id.format,invalid format!' }));

    const result = await processGovernanceDocument(testDocPath, evidenceMap, root);

    const formatViolation = result.violations.find(v => v.type === 'invalid_evidence_id_format');
    assert.ok(formatViolation, 'Should detect invalid evidence ID format');
    assert.ok(formatViolation.message.includes('invalid format!'), 'Should mention the invalid ID');
  });


  test('processGovernanceDocument detects missing evidence mappings', async () => {
    const { root, docsRoot } = makeTempRepo();
    const mapPath = path.join(root, 'evidence', 'map.yml');
    fs.mkdirSync(path.dirname(mapPath), { recursive: true });
    fs.writeFileSync(mapPath, 'existing.id:\n  path: "some/path"\n  description: "Existing ID"\n');

    const evidenceMap = await loadEvidenceMap(mapPath);
    const testDocPath = path.join(docsRoot, 'test.md');
    writeTestFile(testDocPath, makeHeaderDoc({ 'Evidence-IDs': 'existing.id,missing.id' }));

    const result = await processGovernanceDocument(testDocPath, evidenceMap, root);
    
    const mappingViolation = result.violations.find(v => v.type === 'missing_evidence_mapping' && v.evidence_id === 'missing.id');
    assert.ok(mappingViolation, 'Should detect missing evidence mapping');
  });

  test('findGovernanceDocuments locates governance documents', async () => {
    const { root, docsRoot } = makeTempRepo();
    const testDoc = path.join(docsRoot, 'test_doc.md');
    writeTestFile(testDoc, '# Test Document');
    
    // Also create a non-governance doc to ensure it's filtered out
    const otherDoc = path.join(root, 'other', 'not_gov.md');
    fs.mkdirSync(path.dirname(otherDoc), { recursive: true });
    writeTestFile(otherDoc, '# Not Governance');

    const documents = await findGovernanceDocuments(root);

    assert.ok(documents.includes(testDoc), 'Should find governance document');
    assert.ok(!documents.some(d => d.includes('not_gov')), 'Should not include non-governance document');
  });

  test('determinism: two runs produce identical results', async () => {
    const { root, docsRoot } = makeTempRepo();
    const mapPath = path.join(root, 'evidence', 'map.yml');
    fs.mkdirSync(path.dirname(mapPath), { recursive: true });
    fs.writeFileSync(mapPath,
      'governance-docs-integrity:\n  path: "artifacts/governance/docs-integrity/${sha}/stamp.json"\n  description: "Documentation integrity verification results"\n  generator: "governance_docs_verifier"\n\nbranch-protection-drift:\n  path: "artifacts/governance/branch-protection-drift/stamp.json"\n  description: "Branch protection drift detection results"\n  generator: "branch_protection_checker"\n');

    // Create a test governance document
    const testDoc1 = path.join(docsRoot, 'test_doc1.md');
    const testDoc2 = path.join(docsRoot, 'test_doc2.md');
    fs.writeFileSync(testDoc1, makeHeaderDoc({ 'Evidence-IDs': 'governance-docs-integrity,branch-protection-drift' }));
    fs.writeFileSync(testDoc2, makeHeaderDoc({ 'Evidence-IDs': 'nonexistent-id' }));

    const evidenceMap = await loadEvidenceMap(mapPath);

    // Run verification twice
    const result1 = await processGovernanceDocument(testDoc1, evidenceMap, root);
    const result2 = await processGovernanceDocument(testDoc1, evidenceMap, root);

    // Results should be identical
    assert.deepStrictEqual(result1, result2, 'Same input should produce identical output');

    // Test with document that has violations
    const result3 = await processGovernanceDocument(testDoc2, evidenceMap, root);
    const result4 = await processGovernanceDocument(testDoc2, evidenceMap, root);
    assert.deepStrictEqual(result3, result4, 'Same input with violations should produce identical output');
  });

  test('report contains no generated_at field for determinism', async () => {
    const { root, docsRoot } = makeTempRepo();
    const mapPath = path.join(root, 'evidence', 'map.yml');
    fs.mkdirSync(path.dirname(mapPath), { recursive: true });
    fs.writeFileSync(mapPath, 'valid.id:\n  path: "some/path"\n  description: "Valid ID"\n');

    const testDoc = path.join(docsRoot, 'test_doc.md');
    fs.writeFileSync(testDoc, makeHeaderDoc({ 'Evidence-IDs': 'valid.id' }));

    const evidenceMap = await loadEvidenceMap(mapPath);
    const result = await processGovernanceDocument(testDoc, evidenceMap, root);

    const mockSha = 'test-sha';
    const mockPolicyHash = 'test-policy-hash';
    const mockConfig = { governanceDir: 'docs/governance', outputDir: 'test/output', repoRoot: root, evidenceMapPath: mapPath };

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

  test('policy hash is deterministic based on policy content', async () => {
    const { root, docsRoot } = makeTempRepo();
    const mapPath = path.join(root, 'evidence', 'map.yml');
    fs.mkdirSync(path.dirname(mapPath), { recursive: true });
    fs.writeFileSync(mapPath,
      'governance-docs-integrity:\n  path: "artifacts/governance/docs-integrity/${sha}/stamp.json"\n  description: "Documentation integrity verification results"\n  generator: "governance_docs_verifier"\n\nbranch-protection-drift:\n  path: "artifacts/governance/branch-protection-drift/stamp.json"\n  description: "Branch protection drift detection results"\n  generator: "branch_protection_checker"\n');

    // Use the loadEvidenceMap function that uses yaml internally
    const evidenceMap = await loadEvidenceMap(mapPath);

    // Compute policy hash configuration twice
    const config1 = {
      evidence_map_size: evidenceMap.size,
      evidence_map_entries: Array.from(evidenceMap.entries()).sort((a, b) =>
        a[0] === b[0] ? 0 : a[0] < b[0] ? -1 : 1
      ),
      config_governance_dir: 'docs/governance',
      config_output_dir: 'test/output',
      max_evidence_ids_per_doc: 50,
      max_file_size_bytes: 10 * 1024 * 1024,
      max_concurrent_files: 10
    };

    const config2 = {
      evidence_map_size: evidenceMap.size,
      evidence_map_entries: Array.from(evidenceMap.entries()).sort((a, b) =>
        a[0] === b[0] ? 0 : a[0] < b[0] ? -1 : 1
      ),
      config_governance_dir: 'docs/governance',
      config_output_dir: 'test/output',
      max_evidence_ids_per_doc: 50,
      max_file_size_bytes: 10 * 1024 * 1024,
      max_concurrent_files: 10
    };

    const hash1 = generateDeterministicHash(config1);
    const hash2 = generateDeterministicHash(config2);

    assert.strictEqual(hash1, hash2, 'Policy hash should be identical for identical policy content');
  });

  test('writeReports generates deterministic report files', async () => {
    const { root, docsRoot } = makeTempRepo();
    const evidenceMap = new Map([['alpha.id', { path: 'some/path', description: 'Alpha' }]]);

    const testDoc = path.join(docsRoot, 'test_doc.md');
    fs.writeFileSync(testDoc, makeHeaderDoc({ 'Evidence-IDs': 'alpha.id' }));

    const result = await processGovernanceDocument(testDoc, evidenceMap, root);
    const report = buildConsistencyReport({
      sha: 'deterministic-sha',
      policyHash: 'deterministic-policy',
      results: [result],
      config: { governanceDir: 'docs/governance', outputDir: 'artifacts/governance/evidence-id-consistency', repoRoot: '.', evidenceMapPath: 'evidence/map.yml' },
      evidenceMap
    });

    const outDir1 = path.join(root, 'out1');
    const outDir2 = path.join(root, 'out2');
    await writeReports(report, outDir1);
    await writeReports(report, outDir2);

    const reportJson1 = fs.readFileSync(path.join(outDir1, 'report.json'), 'utf8');
    const reportJson2 = fs.readFileSync(path.join(outDir2, 'report.json'), 'utf8');
    const reportMd1 = fs.readFileSync(path.join(outDir1, 'report.md'), 'utf8');
    const reportMd2 = fs.readFileSync(path.join(outDir2, 'report.md'), 'utf8');

    assert.strictEqual(reportJson1, reportJson2, 'report.json should be byte-for-byte identical');
    assert.strictEqual(reportMd1, reportMd2, 'report.md should be byte-for-byte identical');
  });

  test('orphaned evidence IDs are sorted deterministically', () => {
    const evidenceMap = new Map([
      ['beta.id', { path: 'path-b', description: 'Beta' }],
      ['alpha.id', { path: 'path-a', description: 'Alpha' }]
    ]);

    const report = buildConsistencyReport({
      sha: 'orphan-sha',
      policyHash: 'orphan-policy',
      results: [],
      config: {},
      evidenceMap
    });

    assert.deepEqual(report.metadata.orphaned_ids, ['alpha.id', 'beta.id']);
  });
});
