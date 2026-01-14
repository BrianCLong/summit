import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Helper to run shell commands safely
function run(cmd, ignoreError = false) {
  try {
    return execSync(cmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
  } catch (e) {
    if (ignoreError) return null;
    return null; // treat all errors as null/empty for report generation to be robust
  }
}

// 1. Golden Path Status
function getGoldenPathStatus() {
  // Try to get the last status of the 'ga-gate' workflow
  const json = run('gh run list --workflow ga-gate.yml --json status,conclusion,updatedAt --limit 1', true);
  if (!json) return { status: 'unknown', details: 'Could not fetch workflow status' };

  try {
    const runs = JSON.parse(json);
    if (runs.length === 0) return { status: 'no_runs', details: 'No runs found' };
    return {
      status: runs[0].conclusion || runs[0].status,
      lastRun: runs[0].updatedAt
    };
  } catch (e) {
    return { status: 'error', details: 'Failed to parse workflow data' };
  }
}

// 2. Merge Train Snapshot
function getMergeTrainSnapshot() {
  const json = run('gh pr list --state open --json number,title,labels,headRefName,updatedAt --limit 100', true);
  if (!json) return { count: 0, buckets: { total: 0, blocked: 0, priority: 0, ready: 0 }, top: [] };

  try {
    const prs = JSON.parse(json);
    const buckets = {
      total: prs.length,
      blocked: prs.filter(p => p.labels.some(l => l.name === 'blocked')).length,
      priority: prs.filter(p => p.labels.some(l => l.name.includes('priority'))).length,
      ready: prs.filter(p => !p.labels.some(l => l.name === 'blocked' || l.name === 'wip')).length
    };

    // Simple "Top 10" heuristic: oldest updated "ready" PRs? Or just oldest?
    // Let's go with oldest updated "ready" PRs to unstick them.
    const top = prs
      .filter(p => !p.labels.some(l => l.name === 'blocked'))
      .sort((a, b) => new Date(a.updatedAt) - new Date(b.updatedAt))
      .slice(0, 10)
      .map(p => ({ number: p.number, title: p.title, author: p.headRefName })); // headRefName is closest to author we asked for

    return { count: prs.length, buckets, top };
  } catch (e) {
    return { count: 0, buckets: {}, top: [], error: 'Failed to parse PR data' };
  }
}

// 3. Drift Guard Summary
function getDriftGuardSummary() {
  // We'll run the drift check in a "dry run" or capture output mode if possible.
  // Since we want "warn only", we execute it and capture stdout/stderr, ignoring exit code.
  // Using scripts/security/drift-check.ts as discovered.

  try {
    // We expect this might fail if drift is found, so we wrap in try/catch and capture output
    // We assume the script outputs something useful.
    // If it takes too long, this might be bad for a daily report script, but let's try.
    // Optimization: check if a recent artifact exists? No, let's run it.

    // Note: This requires the environment to be set up.
    // We will just report "Skipped" if we are not in a full CI env or if it fails hard.

    // For this implementation, we'll try a lightweight check or just check if the script runs.
    // Actual implementation: run it, catch error.
    execSync('pnpm security:drift-check', { stdio: 'ignore', timeout: 60000 });
    return { status: 'pass', violations: 0 };
  } catch (e) {
    // If it failed, it might be drift or it might be execution error.
    // We'll mark as "detected" for now.
    return { status: 'detected', violations: 'unknown' };
  }
}

// 4. Evidence Status
function getEvidenceStatus() {
  const evidenceFile = 'EVIDENCE_BUNDLE.manifest.json';
  if (fs.existsSync(evidenceFile)) {
    const stats = fs.statSync(evidenceFile);
    return { exists: true, lastUpdated: stats.mtime.toISOString() };
  }
  return { exists: false };
}

// Main
async function main() {
  const date = new Date().toISOString().split('T')[0];
  const reportDir = path.join('artifacts', 'ops', 'daily', date);
  fs.mkdirSync(reportDir, { recursive: true });

  console.log('Generating Daily Ops Report...');

  const golden = getGoldenPathStatus();
  const train = getMergeTrainSnapshot();
  const drift = getDriftGuardSummary();
  const evidence = getEvidenceStatus();

  const alerts = [];
  if (golden.status === 'failure') alerts.push('🚨 Golden Path Gate Failed');
  if (train.buckets.blocked > 5) alerts.push(`⚠️ ${train.buckets.blocked} Blocked PRs`);
  if (drift.status === 'detected') alerts.push('⚠️ Drift Detected (Check logs)');

  const reportData = {
    date,
    golden,
    train,
    drift,
    evidence,
    alerts
  };

  // Write JSON
  fs.writeFileSync(path.join(reportDir, 'daily_ops_report.json'), JSON.stringify(reportData, null, 2));

  // Write Markdown
  const md = `# Daily Ops Report: ${date}

## 🚨 Alerts
${alerts.length > 0 ? alerts.map(a => `- ${a}`).join('\n') : 'No active P0 alerts.'}

## 🌟 Golden Path Status
- **Status**: ${golden.status}
- **Last Run**: ${golden.lastRun || 'N/A'}

## 🚂 Merge Train Snapshot
- **Open PRs**: ${train.count}
- **Ready**: ${train.buckets.ready}
- **Blocked**: ${train.buckets.blocked}
- **Priority**: ${train.buckets.priority}

### Top Candidates (Oldest Ready)
${train.top.map(p => `- #${p.number} ${p.title} (${p.author})`).join('\n')}

## 🛡️ Drift Guard
- **Status**: ${drift.status}

## 📜 Evidence Status
- **Manifest Exists**: ${evidence.exists ? 'Yes' : 'No'}
- **Last Updated**: ${evidence.lastUpdated || 'N/A'}
`;

  fs.writeFileSync(path.join(reportDir, 'daily_ops_report.md'), md);
  console.log(`Report generated at ${reportDir}`);
}

main();
