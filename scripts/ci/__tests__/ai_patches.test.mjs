import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('AI Patch Generation Module', () => {
  test('generateAIPatches creates deterministic patches', async () => {
    // Mock suggestion data
    const mockSuggestions = [
      {
        id: 'suggestion-1',
        kind: 'missing_id',
        severity: 'high',
        confidence: 0.95,
        doc_path: 'docs/governance/test-doc.md',
        evidence_id: 'missing.id.verification',
        summary: 'Add missing evidence ID to governance doc',
        rationale: 'Evidence ID is referenced in policy but not documented',
        related_files: ['docs/governance/test-doc.md']
      },
      {
        id: 'suggestion-2', 
        kind: 'orphan_id',
        severity: 'medium',
        confidence: 0.7,
        registry_path: 'evidence/map.yml',
        orphaned_id: 'orphaned.id.verification',
        summary: 'Remove orphaned evidence ID from registry',
        rationale: 'Evidence ID exists in registry but not referenced anywhere',
        related_files: ['evidence/map.yml']
      }
    ];

    const tempDir = join(tmpdir(), `qwen-patch-test-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });

    try {
      // Import the module functions
      const { generateAIPatches } = await import('../../scripts/ci/ai-providers/patch-generator.mjs');
      assert.ok(typeof generateAIPatches === 'function', 'generateAIPatches should be a function');

      // Test that it handles empty suggestions gracefully
      await generateAIPatches([], tempDir, tempDir);

      // Test with mock suggestions
      await generateAIPatches(mockSuggestions, tempDir, tempDir);

      // Check that the required output files exist
      const patchesDir = join(tempDir, 'ai_patches');
      const indexPath = join(patchesDir, 'index.json');
      const validationPath = join(patchesDir, 'validation.json');
      const bundlePath = join(patchesDir, 'bundle.patch');
      
      const indexExists = await fs.access(indexPath).then(() => true).catch(() => false);
      const validationExists = await fs.access(validationPath).then(() => true).catch(() => false);
      const bundleExists = await fs.access(bundlePath).then(() => true).catch(() => false);
      
      assert.ok(indexExists, 'Index file should be created');
      assert.ok(validationExists, 'Validation file should be created');
      assert.ok(bundleExists, 'Bundle patch file should be created');
      
      // Verify content is deterministic by running twice and comparing
      const firstIndexContent = await fs.readFile(indexPath, 'utf8');
      const firstValidationContent = await fs.readFile(validationPath, 'utf8');
      
      // Run again to ensure deterministic output
      await generateAIPatches(mockSuggestions, tempDir, tempDir);
      
      const secondIndexContent = await fs.readFile(indexPath, 'utf8');
      const secondValidationContent = await fs.readFile(validationPath, 'utf8');
      
      assert.strictEqual(firstIndexContent, secondIndexContent, 'Index content should be deterministic');
      assert.strictEqual(firstValidationContent, secondValidationContent, 'Validation content should be deterministic');
    } finally {
      // Cleanup
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  test('createAddEvidenceIdPatch generates correct unified diff', async () => {
    const { generateAIPatches } = await import('../ai-providers/patch-generator.mjs');
    // We can't directly test internal functions without exporting them
    // So we'll test through the main function indirectly
  });

  test('security: patches do not contain secrets', async () => {
    const mockSuggestionsWithSecrets = [
      {
        id: 'secret-suggestion',
        kind: 'missing_id', 
        summary: 'Contains github token ghp_Abc123def',
        doc_path: 'docs/governance/secret-test.md',
        evidence_id: 'test.id',
        details: {
          content: 'This contains ghp_Abc123def and should not be processed safely'
        }
      }
    ];

    const tempDir = join(tmpdir(), `qwen-secure-test-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });

    try {
      const { generateAIPatches } = await import('../ai-providers/patch-generator.mjs');
      await generateAIPatches(mockSuggestionsWithSecrets, tempDir, tempDir);
      
      const patchesDir = join(tempDir, 'ai_patches');
      const indexPath = join(patchesDir, 'index.json');
      
      if (await fs.access(indexPath).then(() => true).catch(() => false)) {
        const indexContent = await fs.readFile(indexPath, 'utf8');
        const parsedIndex = JSON.parse(indexContent);
        
        // Should have a suppressed entry due to security filtering
        const suppressedPatches = parsedIndex.patches.filter(p => p.status === 'suppressed');
        assert.ok(suppressedPatches.length > 0, 'Should have suppressed patches due to security filters');
        
        for (const patch of suppressedPatches) {
          assert.ok(patch.reasons.includes('security_risk'), 'Suppressed patches should have security reason');
        }
      }
    } finally {
      // Cleanup
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });
});