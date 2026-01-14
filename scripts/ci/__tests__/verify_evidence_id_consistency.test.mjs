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
  processGovernanceDocument
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
});