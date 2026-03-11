#!/usr/bin/env node

/**
 * Quick Resurrection System
 *
 * Scans recent git history to identify resurrection candidates:
 * commits that were reverted, orphaned, or lost in messy merges.
 *
 * Evidence Contract:
 * - Deterministic report: artifacts/history-quick/report.json
 * - Timestamp stamp:      artifacts/history-quick/stamp.json
 * - Schema: schemas/evidence/resurrection-report.schema.json v1.0.0
 *
 * Scoring (from ENTROPY_AND_RESURRECTION_CONTROL_SPEC.md §4.2):
 *   score = recency + patchSizeScore + fileCountScore
 *   recency      = max(0, 100 - ageInDays * 10)
 *   patchSizeScore = 50 if 50≤size≤500 | size if <50 | max(0,50-(size-500)/10)
 *   fileCountScore = min(count * 5, 30)
 *
 * Lane thresholds:
 *   A: score ≥ 120 AND 50 ≤ patchSize ≤ 500
 *   B: score ≥  80 OR (500 < patchSize ≤ 2000)
 *   C: score ≥  40 OR concern == "documentation"
 *   D: score <  40 OR duplicate == true
 */

import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';
import crypto from 'crypto';

const REPO_ROOT = process.cwd();
const OUT_DIR = path.join(REPO_ROOT, 'artifacts/history-quick');

const DEFAULT_LOOKBACK_DAYS = 30;
const DEFAULT_MAX_COMMITS = 200;

// ---------------------------------------------------------------------------
// Git helpers
// ---------------------------------------------------------------------------

function git(cmd) {
  return execSync(cmd, { encoding: 'utf-8', maxBuffer: 20 * 1024 * 1024 }).trim();
}

function getSourceCommit() {
  try { return git('git rev-parse HEAD'); }
  catch { return '0000000000000000000000000000000000000000'; }
}

function getSourceBranch() {
  try { return git('git rev-parse --abbrev-ref HEAD'); }
  catch { return 'unknown'; }
}

/**
 * Return commits in the lookback window, oldest-first (deterministic order).
 * Each entry: { hash, shortHash, subject, author, date, insertions, deletions, files }
 */
function fetchCommits(lookbackDays, maxCommits) {
  const since = new Date();
  since.setDate(since.getDate() - lookbackDays);
  const sinceStr = since.toISOString().split('T')[0];

  const raw = git(
    `git log --no-merges --since="${sinceStr}" --format="%H|%h|%s|%ae|%aI" ` +
    `--diff-filter=ACMRT --numstat -- . 2>/dev/null | head -${maxCommits * 20}`
  );

  if (!raw) return [];

  const commits = [];
  let current = null;

  for (const line of raw.split('\n')) {
    const headerMatch = line.match(/^([0-9a-f]{40})\|([0-9a-f]{7})\|(.+)\|(.+)\|(.+)$/);
    if (headerMatch) {
      if (current) commits.push(current);
      const [, hash, shortHash, subject, author, date] = headerMatch;
      current = { hash, shortHash, subject, author, date, insertions: 0, deletions: 0, files: [] };
      continue;
    }

    if (current && /^\d+\s+\d+\s+\S+/.test(line)) {
      const parts = line.trim().split(/\s+/);
      const ins = parseInt(parts[0], 10) || 0;
      const del = parseInt(parts[1], 10) || 0;
      const file = parts[2];
      current.insertions += ins;
      current.deletions += del;
      if (file && current.files.length < 20) current.files.push(file);
    }
  }
  if (current) commits.push(current);

  // Deterministic: sort by hash (lexicographic) as secondary sort after score
  return commits.slice(0, maxCommits);
}

// ---------------------------------------------------------------------------
// Concern classification
// ---------------------------------------------------------------------------

const CONCERN_RULES = [
  [/^(revert|undo|rollback)\b/i, 'reverted-work'],
  [/(fix|bug|patch|hotfix)\b/i, 'bug-fix'],
  [/(feat|feature|add|implement)\b/i, 'feature'],
  [/(refactor|clean|rename|move)\b/i, 'refactor'],
  [/(test|spec|coverage)\b/i, 'test'],
  [/(doc|docs|readme|changelog)\b/i, 'documentation'],
  [/(ci|cd|workflow|action|pipeline)\b/i, 'ci-cd'],
  [/(deps|dependency|upgrade|bump)\b/i, 'dependency'],
  [/(sec|auth|crypto|permission|acl)\b/i, 'security'],
  [/(perf|optim|speed|cache)\b/i, 'performance'],
];

function classifyConcern(subject, files) {
  const subjectLower = subject.toLowerCase();
  for (const [pattern, concern] of CONCERN_RULES) {
    if (pattern.test(subjectLower)) return concern;
  }
  // File-path fallback
  if (files.some(f => /\.(test|spec)\.[jt]sx?$/.test(f))) return 'test';
  if (files.some(f => /docs?\/|\.md$/i.test(f))) return 'documentation';
  if (files.some(f => /\.github\/|ci\/|scripts\/ci\//i.test(f))) return 'ci-cd';
  return 'general';
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

function computeRecencyScore(dateStr) {
  const commitDate = new Date(dateStr);
  const ageMs = Date.now() - commitDate.getTime();
  const ageInDays = ageMs / (1000 * 60 * 60 * 24);
  return Math.max(0, 100 - ageInDays * 10);
}

function computePatchSizeScore(patchSize) {
  if (patchSize < 50) return patchSize;
  if (patchSize <= 500) return 50;
  return Math.max(0, 50 - (patchSize - 500) / 10);
}

function computeFileCountScore(fileCount) {
  return Math.min(fileCount * 5, 30);
}

function computeScore(commit) {
  const patchSize = commit.insertions + commit.deletions;
  const recency = computeRecencyScore(commit.date);
  const patchSizeScore = computePatchSizeScore(patchSize);
  const fileCountScore = computeFileCountScore(commit.files.length);
  return Math.round(recency + patchSizeScore + fileCountScore);
}

function assignLane(score, patchSize, concern, duplicate) {
  if (duplicate) return 'D';
  if (score >= 120 && patchSize >= 50 && patchSize <= 500) return 'A';
  if (score >= 80 || (patchSize > 500 && patchSize <= 2000)) return 'B';
  if (score >= 40 || concern === 'documentation') return 'C';
  return 'D';
}

// ---------------------------------------------------------------------------
// Duplicate detection
// ---------------------------------------------------------------------------

function normalizeSubject(subject) {
  return subject
    .replace(/\(#\d+\)/g, '')        // strip PR numbers
    .replace(/\s+\(port\)\s*/i, ' ') // strip "(Port)"
    .replace(/\[.*?\]/g, '')         // strip [tags]
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function makeFileSignature(files) {
  return [...files].sort().slice(0, 5).join('|');
}

function detectDuplicates(commits) {
  const seen = new Map(); // signature → first shortHash
  return commits.map(c => {
    const normalized = normalizeSubject(c.subject);
    const fileSig = makeFileSignature(c.files);
    const key = `${normalized}::${fileSig}`;
    if (seen.has(key)) {
      return { ...c, duplicate: true, duplicateOf: seen.get(key) };
    }
    seen.set(key, c.shortHash);
    return { ...c, duplicate: false };
  });
}

// ---------------------------------------------------------------------------
// Evidence ID (deterministic per commit)
// ---------------------------------------------------------------------------

function generateEvidenceId(sourceCommit) {
  const hash = crypto.createHash('sha256');
  hash.update(sourceCommit);
  return `resurrection-${hash.digest('hex').substring(0, 8)}`;
}

// ---------------------------------------------------------------------------
// Report assembly
// ---------------------------------------------------------------------------

function assembleCandidates(commits) {
  const withDuplicates = detectDuplicates(commits);

  return withDuplicates.map(c => {
    const patchSize = c.insertions + c.deletions;
    const concern = classifyConcern(c.subject, c.files);
    const score = computeScore(c);
    const lane = assignLane(score, patchSize, concern, c.duplicate);

    const candidate = {
      hash: c.hash,
      shortHash: c.shortHash,
      subject: c.subject,
      author: c.author,
      date: c.date,
      concern,
      score,
      lane,
      duplicate: c.duplicate,
      fileCount: c.files.length,
      patchSize,
      insertions: c.insertions,
      deletions: c.deletions,
      files: c.files,
    };
    if (c.duplicate && c.duplicateOf) candidate.duplicateOf = c.duplicateOf;
    return candidate;
  });
}

function sortCandidates(candidates) {
  // Deterministic: score desc, then hash asc (stable tie-break)
  return [...candidates].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.hash.localeCompare(b.hash);
  });
}

function buildSummary(candidates, commits) {
  const laneCounts = { A: 0, B: 0, C: 0, D: 0 };
  const concernMap = {};
  const fileTouches = {};

  for (const c of candidates) {
    laneCounts[c.lane]++;
    concernMap[c.concern] = concernMap[c.concern] || { count: 0, patchSize: 0, commits: [] };
    concernMap[c.concern].count++;
    concernMap[c.concern].patchSize += c.patchSize;
    if (concernMap[c.concern].commits.length < 20) {
      concernMap[c.concern].commits.push(c.shortHash);
    }
    for (const f of c.files) {
      fileTouches[f] = fileTouches[f] || { file: f, touchCount: 0, concerns: new Set() };
      fileTouches[f].touchCount++;
      fileTouches[f].concerns.add(c.concern);
    }
  }

  const topFiles = Object.values(fileTouches)
    .sort((a, b) => b.touchCount - a.touchCount)
    .slice(0, 10)
    .map(f => ({ file: f.file, touchCount: f.touchCount, concerns: [...f.concerns].sort() }));

  const allPatchSizes = candidates.map(c => c.patchSize);
  const totalPatches = allPatchSizes.reduce((s, v) => s + v, 0);
  const uniqueConcerns = Object.keys(concernMap).length;

  // Shannon entropy of concern distribution
  let entropy = 0;
  if (totalPatches > 0) {
    for (const v of Object.values(concernMap)) {
      const p = v.patchSize / totalPatches;
      if (p > 0) entropy -= p * Math.log2(p);
    }
  }

  return {
    summary: {
      totalCommits: commits.length,
      concerns: uniqueConcerns,
      filesImpacted: Object.keys(fileTouches).length,
      entropy: Math.round(entropy * 1000) / 1000,
      lanes: {
        A: { count: laneCounts.A, description: 'High-value, merge-ready (score ≥ 120, size 50-500 LOC)' },
        B: { count: laneCounts.B, description: 'Needs synthesis/review (score ≥ 80 or large patch)' },
        C: { count: laneCounts.C, description: 'Informational/low-priority (score ≥ 40)' },
        D: { count: laneCounts.D, description: 'Duplicate or obsolete (score < 40 or duplicate)' },
      },
    },
    concerns: concernMap,
    topFiles,
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const lookbackDays = parseInt(process.env.RESURRECT_LOOKBACK_DAYS || String(DEFAULT_LOOKBACK_DAYS), 10);
  const maxCommits = parseInt(process.env.RESURRECT_MAX_COMMITS || String(DEFAULT_MAX_COMMITS), 10);

  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║            Quick Resurrection System                         ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');
  console.log(`Lookback: ${lookbackDays} days | Max commits: ${maxCommits}\n`);

  const sourceCommit = getSourceCommit();
  const sourceBranch = getSourceBranch();
  const evidenceId = generateEvidenceId(sourceCommit);

  console.log(`Source commit:  ${sourceCommit.substring(0, 8)}`);
  console.log(`Source branch:  ${sourceBranch}`);
  console.log(`Evidence ID:    ${evidenceId}\n`);

  console.log('Fetching git history...');
  const rawCommits = fetchCommits(lookbackDays, maxCommits);
  console.log(`Found ${rawCommits.length} commits in lookback window\n`);

  if (rawCommits.length === 0) {
    console.log('No commits found. Emitting empty report.\n');
  }

  const candidates = assembleCandidates(rawCommits);
  const sorted = sortCandidates(candidates);
  const { summary, concerns, topFiles } = buildSummary(sorted, rawCommits);

  // Deterministic report (no timestamps)
  const report = {
    schemaVersion: '1.0.0',
    evidenceId,
    sourceCommit,
    sourceBranch,
    config: { lookbackDays, maxCommits },
    summary,
    concerns,
    topFiles,
    candidates: sorted,
  };

  // Timestamp stamp (non-deterministic metadata)
  const stamp = {
    timestamp: new Date().toISOString(),
    generatedAt: Date.now(),
    reportId: evidenceId,
    schemaVersion: '1.0.0',
  };

  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(path.join(OUT_DIR, 'report.json'), JSON.stringify(report, null, 2));
  await fs.writeFile(path.join(OUT_DIR, 'stamp.json'), JSON.stringify(stamp, null, 2));

  // Summary output
  console.log('━━━ Lane Distribution ━━━\n');
  const laneIndicators = { A: '✓ A', B: '◉ B', C: '○ C', D: '✕ D' };
  for (const [lane, data] of Object.entries(summary.lanes)) {
    console.log(`  ${laneIndicators[lane]}: ${String(data.count).padStart(3)}  ${data.description}`);
  }
  console.log('');

  console.log('━━━ Top Concerns ━━━\n');
  const sortedConcerns = Object.entries(concerns)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5);
  for (const [concern, data] of sortedConcerns) {
    console.log(`  ${concern.padEnd(20)} ${data.count} commits, ${data.patchSize} LOC`);
  }
  console.log('');

  const laneA = sorted.filter(c => c.lane === 'A').slice(0, 5);
  if (laneA.length > 0) {
    console.log('━━━ Top Lane A Candidates ━━━\n');
    for (const c of laneA) {
      console.log(`  [${c.shortHash}] score=${c.score} ${c.subject.substring(0, 60)}`);
    }
    console.log('');
  }

  console.log(`Artifacts written:`);
  console.log(`  Report: ${path.join(OUT_DIR, 'report.json')}`);
  console.log(`  Stamp:  ${path.join(OUT_DIR, 'stamp.json')}\n`);
}

main().catch(err => {
  console.error('Resurrection error:', err);
  process.exit(1);
});
