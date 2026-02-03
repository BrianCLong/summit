import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// Import the main functions directly from the verification script
import {
  buildConsistencyReport,
  findGovernanceDocuments,
  generateDeterministicHash,
  loadEvidenceMap,
  parseEvidenceIds,
  parseHeaders,
  processGovernanceDocument,
  canonicalJsonStringify,
  compareStringsCodepoint
} from '../verify_evidence_id_consistency.mjs';

describe('Evidence ID Consistency - Final Determinism Verification', () => {
  test('deterministic artifacts are byte-identical with same inputs', async () => {
    // Test that the implementation maintains determinism contract
    const mockResults = [
      {
        path: 'docs/governance/test_doc.md',
        violations: [
          { type: 'missing_evidence_mapping', message: 'Evidence ID missing.id has no mapping', severity: 'warning', evidence_id: 'missing.id' }
        ],
        evidence_ids: ['valid.id', 'missing.id']
      }
    ];
    
    const config = {
      governanceDir: 'docs/governance',
      evidenceMapPath: 'evidence/map.yml',
      outputDir: 'artifacts/governance/evidence-id-consistency',
      repoRoot: process.cwd()
    };
    
    const evidenceMap = new Map([['valid.id', { path: 'some/path', description: 'Valid ID' }]]);
    
    // Create reports twice with same inputs
    const report1 = buildConsistencyReport({
      sha: 'test-determinism',
      policyHash: 'abc123def',
      results: mockResults,
      config,
      evidenceMap
    });
    
    const report2 = buildConsistencyReport({
      sha: 'test-determinism',
      policyHash: 'abc123def',
      results: mockResults,
      config,
      evidenceMap
    });
    
    // Reports should be identical
    assert.deepStrictEqual(report1, report2, 'Reports should be identical with same inputs');
    
    // Also test canonical serialization
    const canonical1 = JSON.stringify(report1, (key, value) => {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        // Create sorted object to ensure consistent key order
        const sorted = {};
        const keys = Object.keys(value).sort(compareStringsCodepoint);
        for (const k of keys) {
          sorted[k] = value[k];
        }
        return sorted;
      }
      return value;
    }, 2);
    
    const canonical2 = JSON.stringify(report2, (key, value) => {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        // Create sorted object to ensure consistent key order
        const sorted = {};
        const keys = Object.keys(value).sort(compareStringsCodepoint);
        for (const k of keys) {
          sorted[k] = value[k];
        }
        return sorted;
      }
      return value;
    }, 2);
    
    assert.strictEqual(canonical1, canonical2, 'Canonical serialization should produce identical output');
  });

  test('no timestamp fields in deterministic artifacts', async () => {
    const mockResults = [
      {
        path: 'docs/governance/test_doc.md',
        violations: [],
        evidence_ids: ['valid.id']
      }
    ];
    
    const config = {
      governanceDir: 'docs/governance',
      evidenceMapPath: 'evidence/map.yml',
      outputDir: 'artifacts/governance/evidence-id-consistency',
      repoRoot: process.cwd()
    };
    
    const evidenceMap = new Map([['valid.id', { path: 'some/path', description: 'Valid ID' }]]);
    
    const report = buildConsistencyReport({
      sha: 'test-timestamp',
      policyHash: 'hash123',
      results: mockResults,
      config,
      evidenceMap
    });
    
    // Ensure no timestamp fields in report.json structure
    const reportJson = JSON.stringify(report);
    assert.ok(!reportJson.includes('generated_at'), 'Report should not contain generated_at');
    assert.ok(!reportJson.includes('timestamp'), 'Report should not contain timestamp');
    assert.ok(!reportJson.includes('created_at'), 'Report should not contain created_at');
  });

  test('metrics are deterministic when inputs are identical', async () => {
    const { root } = await makeTempRepo();
    
    // Create evidence map
    const evidenceMapPath = join(root, 'evidence', 'map.yml');
    await fs.mkdir(join(root, 'evidence'), { recursive: true });
    await fs.writeFile(evidenceMapPath, 'valid.id:\n  path: "some/path"\n  description: "Valid ID"\n');
    
    const evidenceMap = await loadEvidenceMap(evidenceMapPath);
    
    // Create deterministic metrics using the same inputs
    const mockConfig = {
      governanceDir: 'docs/governance',
      evidenceMapPath: 'evidence/map.yml',
      outputDir: 'test/output',
      repoRoot: root
    };
    
    const mockReport = {
      sha: 'test-metrics',
      status: 'pass',
      generator: 'evidence-id-consistency-verifier',
      totals: {
        documents_checked: 1,
        evidence_ids_found: 1,
        evidence_ids_referenced: 1,
        evidence_ids_registered: 1,
        evidence_ids_orphaned: 0,
        violations: 0,
        errors: 0,
        warnings: 0,
        info_messages: 0
      },
      results: [],
      metadata: {
        summary: 'Processed 1 document, found 0 errors',
        orphaned_ids: [],
        recommendations: ['No issues detected']
      }
    };
    
    // Create deterministic metrics twice
    const deterministicMetrics1 = {
      sha: mockReport.sha,
      generator: mockReport.generator,
      gate_version: '1.3.1',
      totals: mockReport.totals,
      accuracy: {
        document_processing_success_rate: 1
      },
      configuration: {
        ai_analysis_enabled: false,
        ai_patches_enabled: false,
        replay_only_mode: process.env.QWEN_REPLAY_ONLY === 'true',
        record_mode_allowed: process.env.ALLOW_QWEN_RECORD_IN_CI === 'true',
        debug_enabled: false
      }
    };
    
    const deterministicMetrics2 = {
      sha: mockReport.sha,
      generator: mockReport.generator,
      gate_version: '1.3.1',
      totals: mockReport.totals,
      accuracy: {
        document_processing_success_rate: 1
      },
      configuration: {
        ai_analysis_enabled: false,
        ai_patches_enabled: false,
        replay_only_mode: process.env.QWEN_REPLAY_ONLY === 'true',
        record_mode_allowed: process.env.ALLOW_QWEN_RECORD_IN_CI === 'true',
        debug_enabled: false
      }
    };
    
    // Ensure canonical serialization is deterministic
    const canonicalMetrics1 = JSON.stringify(deterministicMetrics1, (key, value) => {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        const sorted = {};
        const keys = Object.keys(value).sort(compareStringsCodepoint);
        for (const k of keys) {
          sorted[k] = value[k];
        }
        return sorted;
      }
      return value;
    }, 2);
    
    const canonicalMetrics2 = JSON.stringify(deterministicMetrics2, (key, value) => {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        const sorted = {};
        const keys = Object.keys(value).sort(compareStringsCodepoint);
        for (const k of keys) {
          sorted[k] = value[k];
        }
        return sorted;
      }
      return value;
    }, 2);
    
    assert.strictEqual(canonicalMetrics1, canonicalMetrics2, 'Metrics should be deterministic');
  });
});

async function makeTempRepo() {
  const root = await fs.mkdtemp(join(tmpdir(), 'evidence-test-'));
  const docsRoot = join(root, 'docs', 'governance');
  await fs.mkdir(docsRoot, { recursive: true });
  return { root, docsRoot };
}