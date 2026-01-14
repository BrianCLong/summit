import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  collectWorkflowJobNames,
  loadGovernanceIndex,
  listGovernanceFiles,
  syncGovernanceIndex,
  validateGovernanceIndex,
  writeGovernanceIndex,
} from './lib/governance-docs.mjs';

const args = new Set(process.argv.slice(2));
const shouldFix = args.has('--fix');

const repoRoot = process.cwd();

const writeReport = async ({ reportDir, payload, summary }) => {
  await mkdir(reportDir, { recursive: true });
  await writeFile(path.join(reportDir, 'report.json'), JSON.stringify(payload, null, 2));
  await writeFile(path.join(reportDir, 'summary.md'), summary);
  await writeFile(
    path.join(reportDir, 'stamp.json'),
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        status: payload.status,
        index: payload.index,
      },
      null,
      2,
    ),
  );
};

const buildSummary = (payload) => {
  const lines = [
    '# Governance Docs Integrity Report',
    '',
    `Status: **${payload.status.toUpperCase()}**`,
    '',
    `- Missing paths: ${payload.summary.missing_paths}`,
    `- Extra paths: ${payload.summary.extra_paths}`,
    `- Invalid entries: ${payload.summary.invalid_entries}`,
    `- Duplicate paths: ${payload.summary.duplicate_paths}`,
    `- Duplicate evidence IDs: ${payload.summary.duplicate_evidence_ids}`,
    `- Missing gates: ${payload.summary.missing_gates}`,
  ];

  if (payload.missing_paths.length) {
    lines.push('', '## Missing Paths', ...payload.missing_paths.map((item) => `- ${item}`));
  }
  if (payload.extra_paths.length) {
    lines.push('', '## Extra Paths', ...payload.extra_paths.map((item) => `- ${item}`));
  }
  if (payload.invalid_entries.length) {
    lines.push('', '## Invalid Entries', ...payload.invalid_entries.map((item) => `- ${item.path}`));
  }
  if (payload.missing_gates.length) {
    lines.push('', '## Missing Gates', ...payload.missing_gates.map((item) => `- ${item}`));
  }
  return `${lines.join('\n')}
`;
};

const run = async () => {
  const { data: loadedIndex, fullPath } = await loadGovernanceIndex({ repoRoot });
  let index = loadedIndex;
  const scope = index.scope;
  if (!scope || !scope.root) {
    throw new Error('Index is missing scope.root');
  }

  const files = await listGovernanceFiles({ repoRoot, scope });

  if (shouldFix) {
    index = syncGovernanceIndex({ index, files });
    await writeGovernanceIndex({ fullPath, index });
  }

  const workflowJobNames = await collectWorkflowJobNames(repoRoot);
  const validation = validateGovernanceIndex({
    index,
    files,
    workflowJobNames,
  });

  const payload = {
    status:
      validation.missingPaths.length ||
      validation.extraPaths.length ||
      validation.invalidEntries.length ||
      validation.duplicatePaths.length ||
      validation.duplicateEvidenceIds.length ||
      validation.missingGates.length
        ? 'fail'
        : 'pass',
    summary: {
      missing_paths: validation.missingPaths.length,
      extra_paths: validation.extraPaths.length,
      invalid_entries: validation.invalidEntries.length,
      duplicate_paths: validation.duplicatePaths.length,
      duplicate_evidence_ids: validation.duplicateEvidenceIds.length,
      missing_gates: validation.missingGates.length,
    },
    index: path.relative(repoRoot, fullPath),
    missing_paths: validation.missingPaths,
    extra_paths: validation.extraPaths,
    invalid_entries: validation.invalidEntries.map((entry) => ({
      path: entry.path,
      type: entry.type,
      status: entry.status,
      owner: entry.owner,
      evidence_id: entry.evidence_id,
    })),
    duplicate_paths: validation.duplicatePaths,
    duplicate_evidence_ids: validation.duplicateEvidenceIds,
    missing_gates: validation.missingGates,
  };

  const reportDir = path.join(repoRoot, 'artifacts', 'governance', 'docs-integrity');
  await writeReport({ reportDir, payload, summary: buildSummary(payload) });

  if (payload.status === 'fail') {
    process.exitCode = 1;
  }
};

run();
