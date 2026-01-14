import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  collectWorkflowJobNames,
  loadEvidenceMap,
  loadGovernanceIndex,
  listGovernanceFiles,
  validateEvidenceMap,
  validateGovernanceIndex,
} from '../lib/governance-docs.mjs';

test('governance index is well-formed and complete', async () => {
  const repoRoot = process.cwd();
  const { data: index } = await loadGovernanceIndex({ repoRoot });

  assert.ok(index.version, 'index should define a version');
  assert.ok(index.scope, 'index should define a scope');
  assert.equal(index.scope.root, 'governance');

  const files = await listGovernanceFiles({ repoRoot, scope: index.scope });
  assert.ok(files.length > 0, 'governance scope should have files');

  const workflowJobNames = await collectWorkflowJobNames(repoRoot);
  const validation = validateGovernanceIndex({
    index,
    files,
    workflowJobNames,
  });

  assert.deepEqual(validation.missingPaths, []);
  assert.deepEqual(validation.extraPaths, []);
  assert.deepEqual(validation.invalidEntries, []);
  assert.deepEqual(validation.duplicatePaths, []);
  assert.deepEqual(validation.duplicateEvidenceIds, []);
  assert.deepEqual(validation.missingGates, []);
});

test('evidence map aligns with governance evidence IDs', async () => {
  const repoRoot = process.cwd();
  const { data: index } = await loadGovernanceIndex({ repoRoot });
  const { data: evidenceMap } = await loadEvidenceMap({ repoRoot });

  const validation = validateEvidenceMap({ index, evidenceMap });

  assert.deepEqual(validation.missingInMap, []);
  assert.deepEqual(validation.extraInMap, []);
  assert.deepEqual(validation.duplicateIndexIds, []);
  assert.deepEqual(validation.duplicateMapIds, []);
  assert.deepEqual(validation.pathMismatch, []);
});
