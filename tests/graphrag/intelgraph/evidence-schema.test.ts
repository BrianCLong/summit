import { test } from 'node:test';
import assert from 'node:assert';
import { validateEvidenceSchema } from '../../../.github/scripts/intelgraph/validate-schema.ts';
import { writeDeterministicArtifacts } from '../../../.github/scripts/intelgraph/write-artifacts.ts';
import fs from 'node:fs';
import path from 'node:path';

test('IntelGraph Schema Validator - Valid Schema', () => {
  const validData = {
    evidence_id: 'IG-TEST-SCHEMA-0001',
    entity_refs: ['ent-1', 'ent-2'],
    edge_refs: ['edge-1'],
    provenance: {
      source_type: 'OSINT',
      source_ref: 'https://example.com',
      collection_method: 'automated'
    },
    confidence: 0.95
  };

  const result = validateEvidenceSchema(validData);
  assert.strictEqual(result.valid, true);
  assert.strictEqual(result.errors.length, 0);
});

test('IntelGraph Schema Validator - Missing Provenance', () => {
  const invalidData = {
    evidence_id: 'IG-TEST-SCHEMA-0002',
    entity_refs: [],
    edge_refs: [],
    confidence: 0.8
  };

  const result = validateEvidenceSchema(invalidData);
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.some(e => e.includes('Missing required field: provenance')));
});

test('IntelGraph Schema Validator - Disallowed Timestamps', () => {
  const invalidData = {
    evidence_id: 'IG-TEST-SCHEMA-0003',
    entity_refs: [],
    edge_refs: [],
    provenance: {
      source_type: 'test',
      source_ref: 'test',
      collection_method: 'test'
    },
    confidence: 0.8,
    createdAt: '2023-01-01T00:00:00Z'
  };

  const result = validateEvidenceSchema(invalidData);
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.some(e => e.includes('Disallowed timestamp field found: createdAt')));
});

test('IntelGraph Schema Validator - Invalid Evidence ID format', () => {
  const invalidData = {
    evidence_id: 'EVIDENCE-0004',
    entity_refs: [],
    edge_refs: [],
    provenance: {
      source_type: 'test',
      source_ref: 'test',
      collection_method: 'test'
    },
    confidence: 0.8
  };

  const result = validateEvidenceSchema(invalidData);
  assert.strictEqual(result.valid, false);
  assert.ok(result.errors.some(e => e.includes('Invalid evidence_id format')));
});

test('IntelGraph Artifact Writer - Deterministic Timestamps Removal', () => {
  const testDir = path.join(process.cwd(), 'tests', 'graphrag', 'intelgraph', 'artifacts_test_dir');

  const report = { test: true };
  const metrics = { count: 1 };
  const stamp = { version: '1.0', createdAt: 'timestamp-to-remove', createdAtIso: 'another-timestamp' };

  try {
    writeDeterministicArtifacts(testDir, report, metrics, stamp);

    const stampContent = fs.readFileSync(path.join(testDir, 'stamp.json'), 'utf-8');
    const stampParsed = JSON.parse(stampContent);

    assert.strictEqual(stampParsed.version, '1.0');
    assert.strictEqual(stampParsed.createdAt, undefined);
    assert.strictEqual(stampParsed.createdAtIso, undefined);
  } finally {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  }
});
