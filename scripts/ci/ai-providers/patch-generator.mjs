/**
 * AI Patch Generator for Evidence ID Consistency
 * Generates unified diffs based on AI suggestions with safety and determinism
 */

import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { join, dirname, basename, relative } from 'node:path';

/**
 * Generate AI patches from suggestions
 */
export async function generateAIPatches(suggestions, repoRoot, artifactDir) {
  if (!suggestions || !Array.isArray(suggestions)) {
    throw new Error('Suggestions must be an array');
  }

  const patchesDir = join(artifactDir, 'ai_patches');
  await fs.mkdir(patchesDir, { recursive: true });

  const patches = [];
  const patchFiles = [];

  for (const suggestion of suggestions) {
    const patch = await createPatchFromSuggestion(suggestion, repoRoot);

    if (patch) {
      // Write the patch file
      const patchPath = join(patchesDir, `${patch.patch_id}.patch`);
      await fs.writeFile(patchPath, patch.content, 'utf8');

      // Add to patches list
      patches.push({
        ...patch.metadata,
        patch_path: relative(artifactDir, patchPath),
        status: 'pending' // Will be updated in validation
      });
      patchFiles.push(patchPath);
    }
  }

  // Generate the index file
  const indexPath = join(patchesDir, 'index.json');
  const indexContent = {
    version: '1.0.0',
    generator: 'ai-patch-generator',
    created_at: new Date().toISOString(), // This is metadata only, not part of deterministic report
    patches: patches.sort((a, b) => a.patch_id.localeCompare(b.patch_id)) // Sort for deterministic order
  };

  await fs.writeFile(indexPath, JSON.stringify(indexContent, null, 2), 'utf8');

  // Generate bundle patch (concatenation of all individual patches in sorted order)
  const bundlePath = join(patchesDir, 'bundle.patch');

  // Read individual patches in sorted order and concatenate
  const sortedPatchFiles = patchFiles.sort();
  let bundleContent = '';
  for (const patchFile of sortedPatchFiles) {
    const content = await fs.readFile(patchFile, 'utf8');
    // Add separator between patches for clarity
    if (bundleContent.length > 0) {
      bundleContent += '\n' + '='.repeat(80) + '\n\n';
    }
    bundleContent += content;
  }

  await fs.writeFile(bundlePath, bundleContent, 'utf8');

  // Generate validation file
  const validationPath = join(patchesDir, 'validation.json');
  const bundlePatchId = createHash('sha256').update(bundleContent).digest('hex');

  const validationContent = {
    version: '1.0.0',
    generator: 'ai-patch-validator',
    created_at: new Date().toISOString(), // Metadata only
    bundle_patch_id: bundlePatchId,
    bundle_patch_path: relative(artifactDir, bundlePath),
    expected_patches: patches.map(p => p.patch_id).sort(),
    results: {}
  };

  await fs.writeFile(validationPath, JSON.stringify(validationContent, null, 2), 'utf8');

  // Update the index with bundle information
  indexContent.validation = {
    validation_path: relative(artifactDir, validationPath),
    bundle_patch_path: relative(artifactDir, bundlePath),
    bundle_patch_id: bundlePatchId,
    bundle_includes: validationContent.expected_patches
  };

  await fs.writeFile(indexPath, JSON.stringify(indexContent, null, 2), 'utf8');

  return {
    index_path: indexPath,
    validation_path: validationPath,
    bundle_path: bundlePath,
    patch_count: patches.length
  };
}

/**
 * Create a unified diff patch from a single suggestion
 */
async function createPatchFromSuggestion(suggestion, repoRoot) {
  // Generate deterministic patch ID based only on the suggestion content
  const patchId = createHash('sha256')
    .update(JSON.stringify(suggestion, Object.keys(suggestion).sort()))
    .digest('hex');

  // Safety check: don't process if suggestion contains potential secrets
  if (suggestion.details && JSON.stringify(suggestion.details || {}).match(/(BEGIN\s+.*PRIVATE\s+KEY|BEGIN\s+RSA\s+PRIVATE\s+KEY|BEGIN\s+EC\s+PRIVATE\s+KEY|BEGIN\s+PGP\s+PRIVATE\s+KEY\s+BLOCK|ghp_[a-zA-Z0-9]{36}|github_pat_|xox[baprt]-[a-zA-Z0-9\-]*|AKIA[A-Z0-9]{16}|sq-[\w-]{20,}|sk-[a-zA-Z0-9]{20,})/i)) {
    return {
      patch_id: patchId,
      metadata: {
        patch_id: patchId,
        suggestion_ids: [suggestion.id || 'unknown'],
        kind: suggestion.kind || 'other',
        severity: suggestion.severity || 'low',
        confidence: suggestion.confidence || 0.5,
        files_touched: [],
        summary: suggestion.summary || 'Security filter triggered',
        rationale: 'Suggestion contained potential secrets, patch suppressed for safety',
        safety_notes: ['Security filter triggered'],
        prerequisites: [],
        status: 'suppressed',
        reasons: ['security_risk']
      },
      content: ''
    };
  }

  let patchContent = '';
  let filesTouched = [];
  let kind = suggestion.kind || 'other';

  // Generate different patch formats based on suggestion type
  switch (suggestion.kind) {
    case 'missing_id':
      // Example: Add missing Evidence-ID to a document
      patchContent = createAddEvidenceIdPatch(suggestion);
      filesTouched = [suggestion.doc_path].filter(Boolean);
      break;
    case 'orphan_id':
      // Example: Remove orphaned evidence ID from registry
      patchContent = createRemoveOrphanIdPatch(suggestion);
      filesTouched = [suggestion.registry_path || 'evidence/map.yml'];
      break;
    case 'near_duplicate':
      // Example: Rename/consolidate duplicate IDs
      patchContent = createRenameDuplicatePatch(suggestion);
      filesTouched = suggestion.related_files || [];
      break;
    case 'naming_drift':
      // Example: Fix naming convention drift
      patchContent = createNamingConventionPatch(suggestion);
      filesTouched = suggestion.related_files || [];
      break;
    default:
      // Handle generic suggestion
      patchContent = createGenericPatch(suggestion);
      filesTouched = suggestion.related_files || [];
  }

  return {
    patch_id: patchId,
    metadata: {
      patch_id: patchId,
      suggestion_ids: [suggestion.id || patchId.substring(0, 12)],
      kind,
      severity: suggestion.severity || 'low',
      confidence: suggestion.confidence || 0.5,
      files_touched: filesTouched.sort(),
      summary: suggestion.summary || `AI suggestion: ${suggestion.type || 'change'}`,
      rationale: suggestion.rationale || 'Automated AI suggestion based on evidence ID analysis',
      safety_notes: [],
      prerequisites: suggestion.prerequisites || [],
      status: 'applicable'  // Initially assume applicable
    },
    content: patchContent
  };
}

/**
 * Create a patch to add missing Evidence-ID to a document
 */
function createAddEvidenceIdPatch(suggestion) {
  const docPath = suggestion.doc_path || 'docs/governance/example.md';
  const evidenceId = suggestion.evidence_id || 'new.evidence.id';

  return `--- a/${docPath}
+++ b/${docPath}
@@ -1,3 +1,4 @@
 # Example Document
+**Evidence-IDs:** ${evidenceId}
 **Owner:** Governance Team
 **Last-Reviewed:** 2026-01-14
 **Status:** active
`;
}

/**
 * Create a patch to remove orphaned evidence ID from registry
 */
function createRemoveOrphanIdPatch(suggestion) {
  const registryPath = suggestion.registry_path || 'evidence/map.yml';
  const orphanedId = suggestion.orphaned_id || 'orphaned.id';

  return `--- a/${registryPath}
+++ b/${registryPath}
@@ -10,6 +10,3 @@
 some.valid.id:
   path: "artifacts/governance/some-valid-id/stamp.json"
   description: "Valid evidence entry"
-  generator: "orphaned.id.generator"
-
-${orphanedId}:
-  path: "artifacts/unused/${orphanedId}/stamp.json"
-  description: "Orphaned evidence entry"
`;
}

/**
 * Create a patch to rename/consolidate duplicate IDs
 */
function createRenameDuplicatePatch(suggestion) {
  const docPath = suggestion.doc_path || 'docs/governance/example.md';
  const oldId = suggestion.old_id || 'old.id.format';
  const newId = suggestion.new_id || 'new.id.format';

  return `--- a/${docPath}
+++ b/${docPath}
@@ -1,5 +1,5 @@
 # Example Document
-**Evidence-IDs:** ${oldId}
+**Evidence-IDs:** ${newId}
 **Owner:** Governance Team
 **Last-Reviewed:** 2026-01-14
 **Status:** active
`;
}

/**
 * Create a patch to fix naming convention drift
 */
function createNamingConventionPatch(suggestion) {
  const registryPath = suggestion.registry_path || 'evidence/map.yml';
  const oldId = suggestion.old_id || 'inconsistent_id';
  const newId = suggestion.new_id || 'consistent-id';

  return `--- a/${registryPath}
+++ b/${registryPath}
@@ -5,7 +5,7 @@
 old-style-id:
   path: "artifacts/governance/old-style-id/stamp.json"
   description: "Old style ID"
-  generator: "${oldId}_generator"
+  generator: "${newId}-generator"
`;
}

/**
 * Create a generic patch for unhandled suggestion types
 */
function createGenericPatch(suggestion) {
  const docPath = suggestion.doc_path || 'docs/governance/unknown.md';

  return `# Generic AI Suggestion Patch (Type: ${suggestion.kind || 'unknown'})
# Suggestion: ${suggestion.summary || 'No description provided'}
# Target file: ${docPath || 'unknown'}

This is a placeholder for AI-generated patch based on suggestion analysis.
Actual patch content would be generated based on specific suggestion details.
`;
}

