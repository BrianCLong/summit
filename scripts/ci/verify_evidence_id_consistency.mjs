import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  loadEvidenceMap,
  loadGovernanceIndex,
  validateEvidenceMap,
} from './lib/governance-docs.mjs';

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
        evidence_map: payload.evidence_map,
      },
      null,
      2,
    ),
  );
};

const buildSummary = (payload) => {
  const lines = [
    '# Evidence ID Consistency Report',
    '',
    `Status: **${payload.status.toUpperCase()}**`,
    '',
    `- Missing in map: ${payload.summary.missing_in_map}`,
    `- Extra in map: ${payload.summary.extra_in_map}`,
    `- Duplicate index IDs: ${payload.summary.duplicate_index_ids}`,
    `- Duplicate map IDs: ${payload.summary.duplicate_map_ids}`,
    `- Path mismatches: ${payload.summary.path_mismatch}`,
  ];

  if (payload.missing_in_map.length) {
    lines.push('', '## Missing In Evidence Map', ...payload.missing_in_map.map((item) => `- ${item}`));
  }
  if (payload.extra_in_map.length) {
    lines.push('', '## Extra In Evidence Map', ...payload.extra_in_map.map((item) => `- ${item}`));
  }
  if (payload.path_mismatch.length) {
    lines.push('', '## Path Mismatches');
    payload.path_mismatch.forEach((entry) => {
      lines.push(`- ${entry.evidence_id}: index=${entry.index_path} map=${entry.map_path}`);
    });
  }
  return `${lines.join('\n')}
`;
};

const run = async () => {
  const { data: index, fullPath: indexPath } = await loadGovernanceIndex({ repoRoot });
  const { data: evidenceMap, fullPath: evidenceMapPath } = await loadEvidenceMap({ repoRoot });

  const validation = validateEvidenceMap({ index, evidenceMap });

  const payload = {
    status:
      validation.missingInMap.length ||
      validation.extraInMap.length ||
      validation.duplicateIndexIds.length ||
      validation.duplicateMapIds.length ||
      validation.pathMismatch.length
        ? 'fail'
        : 'pass',
    summary: {
      missing_in_map: validation.missingInMap.length,
      extra_in_map: validation.extraInMap.length,
      duplicate_index_ids: validation.duplicateIndexIds.length,
      duplicate_map_ids: validation.duplicateMapIds.length,
      path_mismatch: validation.pathMismatch.length,
    },
    index: path.relative(repoRoot, indexPath),
    evidence_map: path.relative(repoRoot, evidenceMapPath),
    missing_in_map: validation.missingInMap,
    extra_in_map: validation.extraInMap,
    duplicate_index_ids: validation.duplicateIndexIds,
    duplicate_map_ids: validation.duplicateMapIds,
    path_mismatch: validation.pathMismatch,
  };

  const reportDir = path.join(repoRoot, 'artifacts', 'governance', 'evidence-id-consistency');
  await writeReport({ reportDir, payload, summary: buildSummary(payload) });

  if (payload.status === 'fail') {
    process.exitCode = 1;
  }
};

run();
