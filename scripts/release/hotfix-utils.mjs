import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

export function parseCommitList(raw) {
  if (!raw) {
    return [];
  }
  return raw
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0);
}

export function normalizeCommitList(raw) {
  const commits = parseCommitList(raw);
  ensureUniqueCommits(commits);
  return commits;
}

export function ensureUniqueCommits(commits) {
  const seen = new Set();
  for (const sha of commits) {
    if (seen.has(sha)) {
      throw new Error(`Duplicate commit detected: ${sha}`);
    }
    seen.add(sha);
  }
}

export function parseVersionString(version) {
  const normalized = version.startsWith('v') ? version.slice(1) : version;
  const match = normalized.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) {
    throw new Error(`Invalid version format: ${version}`);
  }
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    normalized,
  };
}

export function formatBranchName(template, version) {
  return template.replace('{version}', version);
}

export function stableStringify(value) {
  return JSON.stringify(sortValue(value), null, 2) + '\n';
}

function sortValue(value) {
  if (Array.isArray(value)) {
    return value.map(item => sortValue(item));
  }
  if (value && typeof value === 'object') {
    const sorted = {};
    for (const key of Object.keys(value).sort()) {
      sorted[key] = sortValue(value[key]);
    }
    return sorted;
  }
  return value;
}

export function buildHotfixSnapshot({
  baseTag,
  baseCommit,
  branchName,
  selectedCommits,
  resultingCommit,
  lockfileHashes,
  generatedAt,
}) {
  return {
    version: '1.0.0',
    hotfix: {
      base_tag: baseTag,
      base_commit: baseCommit,
      branch: branchName,
      selected_commits: selectedCommits,
      resulting_commit: resultingCommit,
    },
    lockfiles: lockfileHashes,
    generated_at: generatedAt,
  };
}

export function buildHotfixRecord({
  tag,
  version,
  baseTag,
  baseCommit,
  selectedCommits,
  finalCommit,
  evidence,
  dashboard,
  actor,
  workflowRun,
  recordedAt,
}) {
  return {
    version: '1.0.0',
    hotfix: {
      tag,
      version,
      base_tag: baseTag,
      base_commit: baseCommit,
      selected_commits: selectedCommits,
      final_commit: finalCommit,
    },
    evidence,
    dashboard,
    actor,
    workflow_run: workflowRun,
    recorded_at: recordedAt,
  };
}

export function hashFile(path) {
  const data = readFileSync(path);
  return createHash('sha256').update(data).digest('hex');
}
