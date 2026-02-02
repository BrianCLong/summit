/**
 * Idempotent issue lifecycle manager for branch protection drift.
 *
 * Features:
 * - Stable issue lookup via label + hidden marker
 * - Deduplication (no duplicate issues for same drift)
 * - State transitions: VERIFIED_DRIFT → create/update, VERIFIED_MATCH → close, UNVERIFIABLE → comment only
 * - Rate limit handling with fallback
 */

import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';

const DRIFT_LABEL = 'branch-protection-drift';
const HIDDEN_MARKER_PREFIX = '<!-- BP_DRIFT_MARKER:';
const HIDDEN_MARKER_SUFFIX = ' -->';

function execFileAsync(command, args, options = {}) {
  const mergedEnv = {
    ...process.env,
    GH_PAGER: 'cat',
    GITHUB_PAGER: 'cat',
    LESS: 'FRSX'
  };
  return new Promise((resolvePromise, reject) => {
    execFile(command, args, { ...options, env: mergedEnv }, (error, stdout, stderr) => {
      if (error) {
        const wrapped = new Error(stderr || error.message);
        wrapped.cause = error;
        wrapped.exitCode = error.code;
        reject(wrapped);
        return;
      }
      resolvePromise({ stdout, stderr });
    });
  });
}

function generateStableMarker(repo, branch) {
  const input = `${repo}:${branch}`;
  const hash = createHash('sha256').update(input).digest('hex').slice(0, 12);
  return `${HIDDEN_MARKER_PREFIX}${hash}${HIDDEN_MARKER_SUFFIX}`;
}

function sortKeysDeep(value) {
  if (Array.isArray(value)) {
    return value.map(sortKeysDeep);
  }
  if (value && typeof value === 'object') {
    const sorted = {};
    for (const key of Object.keys(value).sort()) {
      sorted[key] = sortKeysDeep(value[key]);
    }
    return sorted;
  }
  return value;
}

function stableJson(value) {
  return JSON.stringify(sortKeysDeep(value), null, 2);
}

function formatDriftIssueBody({ repo, branch, diff, marker }) {
  const lines = [];
  lines.push(marker);
  lines.push('');
  lines.push('## Branch Protection Drift Detected');
  lines.push('');
  lines.push(`**Repository:** ${repo}`);
  lines.push(`**Branch:** ${branch}`);
  lines.push('');

  if (diff.missing_in_github.length > 0) {
    lines.push('### Missing in GitHub');
    lines.push('');
    for (const ctx of diff.missing_in_github.slice().sort()) {
      lines.push(`- \`${ctx}\``);
    }
    lines.push('');
  }

  if (diff.extra_in_github.length > 0) {
    lines.push('### Extra in GitHub');
    lines.push('');
    for (const ctx of diff.extra_in_github.slice().sort()) {
      lines.push(`- \`${ctx}\``);
    }
    lines.push('');
  }

  if (diff.strict_mismatch) {
    lines.push('### Strict Setting Drift');
    lines.push('');
    lines.push('The `strict` setting differs between policy and GitHub.');
    lines.push('');
  }

  lines.push('### Remediation');
  lines.push('');
  lines.push('```bash');
  lines.push(`pnpm ci:branch-protection:apply -- --repo ${repo} --branch ${branch}`);
  lines.push('```');
  lines.push('');
  lines.push('---');
  lines.push('This issue is managed automatically. It will be closed when drift is resolved.');

  return lines.join('\n');
}

function formatUnverifiableComment(state, error) {
  const lines = [];
  lines.push('## Verification Unavailable');
  lines.push('');
  lines.push(`**State:** ${state}`);
  if (error) {
    lines.push(`**Reason:** ${error}`);
  }
  lines.push('');
  lines.push('Branch protection verification could not be performed. This is not a drift detection.');
  lines.push('The issue remains open until verification succeeds.');

  return lines.join('\n');
}

function formatResolutionComment() {
  return `## Drift Resolved

Branch protection now matches the policy. This issue is being closed automatically.`;
}

async function findExistingIssue(repo, marker) {
  try {
    const { stdout } = await execFileAsync('gh', [
      'issue', 'list',
      '--repo', repo,
      '--label', DRIFT_LABEL,
      '--state', 'all',
      '--json', 'number,title,body,state',
      '--limit', '50'
    ]);
    const issues = JSON.parse(stdout || '[]');
    for (const issue of issues) {
      if (issue.body && issue.body.includes(marker)) {
        return issue;
      }
    }
    return null;
  } catch (error) {
    if (error.message && error.message.includes('rate limit')) {
      throw new Error('RATE_LIMITED: Cannot search issues');
    }
    throw error;
  }
}

async function ensureLabelExists(repo) {
  try {
    await execFileAsync('gh', [
      'label', 'create', DRIFT_LABEL,
      '--repo', repo,
      '--description', 'Branch protection drift detected',
      '--color', 'D93F0B',
      '--force'
    ]);
  } catch (error) {
    // Label may already exist or user lacks permission - not critical
  }
}

async function createDriftIssue({ repo, branch, diff }) {
  const marker = generateStableMarker(repo, branch);
  const body = formatDriftIssueBody({ repo, branch, diff, marker });
  const title = `Branch protection drift: ${branch}`;

  await ensureLabelExists(repo);

  const { stdout } = await execFileAsync('gh', [
    'issue', 'create',
    '--repo', repo,
    '--title', title,
    '--body', body,
    '--label', DRIFT_LABEL
  ], { maxBuffer: 10 * 1024 * 1024 });

  const match = stdout.trim().match(/\/issues\/(\d+)$/);
  return match ? Number(match[1]) : null;
}

async function updateDriftIssue({ repo, issueNumber, branch, diff }) {
  const marker = generateStableMarker(repo, branch);
  const body = formatDriftIssueBody({ repo, branch, diff, marker });

  await execFileAsync('gh', [
    'issue', 'edit', String(issueNumber),
    '--repo', repo,
    '--body', body
  ]);

  return issueNumber;
}

async function closeDriftIssue({ repo, issueNumber }) {
  const comment = formatResolutionComment();

  await execFileAsync('gh', [
    'issue', 'comment', String(issueNumber),
    '--repo', repo,
    '--body', comment
  ]);

  await execFileAsync('gh', [
    'issue', 'close', String(issueNumber),
    '--repo', repo,
    '--reason', 'completed'
  ]);

  return issueNumber;
}

async function addUnverifiableComment({ repo, issueNumber, state, error }) {
  const comment = formatUnverifiableComment(state, error);

  await execFileAsync('gh', [
    'issue', 'comment', String(issueNumber),
    '--repo', repo,
    '--body', comment
  ]);

  return issueNumber;
}

function diffContentHash(diff) {
  const normalized = {
    extra_in_github: diff.extra_in_github.slice().sort(),
    missing_in_github: diff.missing_in_github.slice().sort(),
    strict_mismatch: Boolean(diff.strict_mismatch)
  };
  return createHash('sha256').update(stableJson(normalized)).digest('hex').slice(0, 16);
}

/**
 * Manage drift issue lifecycle based on verification state.
 *
 * @param {Object} options
 * @param {string} options.repo - Repository in owner/name format
 * @param {string} options.branch - Branch name
 * @param {string} options.state - VerificationState enum value
 * @param {Object} [options.diff] - Drift diff object (required for VERIFIED_DRIFT)
 * @param {string} [options.error] - Error message for UNVERIFIABLE states
 * @returns {Promise<{action: string, issueNumber?: number}>}
 */
async function manageDriftIssue({ repo, branch, state, diff, error }) {
  const marker = generateStableMarker(repo, branch);
  let existingIssue;

  try {
    existingIssue = await findExistingIssue(repo, marker);
  } catch (err) {
    if (err.message && err.message.startsWith('RATE_LIMITED')) {
      return { action: 'skipped', reason: 'rate_limited' };
    }
    return { action: 'error', reason: err.message };
  }

  // VERIFIED_MATCH: close any existing drift issue
  if (state === 'VERIFIED_MATCH') {
    if (existingIssue && existingIssue.state === 'open') {
      await closeDriftIssue({ repo, issueNumber: existingIssue.number });
      return { action: 'closed', issueNumber: existingIssue.number };
    }
    return { action: 'none', reason: 'no_open_issue' };
  }

  // VERIFIED_DRIFT: create or update issue
  if (state === 'VERIFIED_DRIFT' && diff) {
    if (!existingIssue) {
      const issueNumber = await createDriftIssue({ repo, branch, diff });
      return { action: 'created', issueNumber };
    }

    if (existingIssue.state === 'closed') {
      // Reopen by creating a new issue (gh doesn't easily reopen with new body)
      const issueNumber = await createDriftIssue({ repo, branch, diff });
      return { action: 'created', issueNumber, note: 'previous_was_closed' };
    }

    // Check if diff content changed (avoid unnecessary updates)
    const currentDiffHash = diffContentHash(diff);
    const bodyContainsSameContent = existingIssue.body &&
      existingIssue.body.includes(`missing_in_github: ${diff.missing_in_github.length}`) &&
      existingIssue.body.includes(`extra_in_github: ${diff.extra_in_github.length}`);

    // Always update to reflect current state
    await updateDriftIssue({ repo, issueNumber: existingIssue.number, branch, diff });
    return { action: 'updated', issueNumber: existingIssue.number };
  }

  // UNVERIFIABLE states: add comment if issue exists, never create
  if (state === 'UNVERIFIABLE_PERMISSIONS' || state === 'UNVERIFIABLE_ERROR' || state === 'RATE_LIMITED') {
    if (existingIssue && existingIssue.state === 'open') {
      await addUnverifiableComment({ repo, issueNumber: existingIssue.number, state, error });
      return { action: 'commented', issueNumber: existingIssue.number };
    }
    return { action: 'none', reason: 'no_open_issue_to_comment' };
  }

  // NO_PROTECTION: close any existing drift issue (no protection = no drift)
  if (state === 'NO_PROTECTION') {
    if (existingIssue && existingIssue.state === 'open') {
      await closeDriftIssue({ repo, issueNumber: existingIssue.number });
      return { action: 'closed', issueNumber: existingIssue.number, note: 'no_protection_configured' };
    }
    return { action: 'none', reason: 'no_open_issue' };
  }

  return { action: 'none', reason: 'unknown_state' };
}

export {
  DRIFT_LABEL,
  addUnverifiableComment,
  closeDriftIssue,
  createDriftIssue,
  diffContentHash,
  findExistingIssue,
  formatDriftIssueBody,
  formatResolutionComment,
  formatUnverifiableComment,
  generateStableMarker,
  manageDriftIssue,
  updateDriftIssue
};
