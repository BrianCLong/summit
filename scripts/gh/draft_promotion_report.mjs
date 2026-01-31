#!/usr/bin/env node
/**
 * Draft PR Promotion Report Generator
 *
 * Reads gh pr list JSON output and generates a markdown summary with triage scaffolding.
 *
 * Usage:
 *   # Generate JSON first
 *   gh pr list --draft --limit 200 --json number,title,author,updatedAt,headRefName,mergeable,statusCheckRollup,labels,url > reports/draft_promotion/drafts.json
 *
 *   # Then run this script
 *   node scripts/gh/draft_promotion_report.mjs
 *
 * Output:
 *   - reports/draft_promotion/DRAFTS_SUMMARY_<date>.md
 *   - reports/draft_promotion/TRIAGE_<date>.md (scaffold)
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const REPORTS_DIR = 'reports/draft_promotion';
const INPUT_FILE = join(REPORTS_DIR, 'drafts.json');

function formatDate(dateStr) {
  return dateStr ? dateStr.split('T')[0] : 'N/A';
}

function getCheckStatus(statusCheckRollup) {
  if (!statusCheckRollup || statusCheckRollup.length === 0) return 'none';

  const states = statusCheckRollup.map(c => c.conclusion || c.state);
  if (states.every(s => s === 'SUCCESS' || s === 'NEUTRAL')) return 'green';
  if (states.some(s => s === 'FAILURE')) return 'failed';
  if (states.some(s => s === 'PENDING' || s === 'IN_PROGRESS')) return 'pending';
  return 'unknown';
}

function categorizePR(pr) {
  const checkStatus = getCheckStatus(pr.statusCheckRollup);
  const updatedDate = new Date(pr.updatedAt);
  const daysSinceUpdate = Math.floor((Date.now() - updatedDate) / (1000 * 60 * 60 * 24));

  // PROMOTE_NOW: mergeable, checks green/neutral, updated within 7 days
  if (pr.mergeable === 'MERGEABLE' && checkStatus === 'green' && daysSinceUpdate < 7) {
    return 'PROMOTE_NOW';
  }

  // STALE_CLOSE_CANDIDATE: not updated in 30+ days
  if (daysSinceUpdate > 30) {
    return 'STALE_CLOSE_CANDIDATE';
  }

  // FIX_TO_PROMOTE: has conflicts or pending checks but recent
  if ((pr.mergeable === 'CONFLICTING' || checkStatus === 'pending' || checkStatus === 'failed') && daysSinceUpdate < 14) {
    return 'FIX_TO_PROMOTE';
  }

  // NEEDS_OWNER: everything else
  return 'NEEDS_OWNER';
}

function main() {
  // Ensure reports directory exists
  if (!existsSync(REPORTS_DIR)) {
    mkdirSync(REPORTS_DIR, { recursive: true });
  }

  // Check for input file
  if (!existsSync(INPUT_FILE)) {
    console.error(`Error: ${INPUT_FILE} not found.`);
    console.error('Run: gh pr list --draft --limit 200 --json number,title,author,updatedAt,headRefName,mergeable,statusCheckRollup,labels,url > ' + INPUT_FILE);
    process.exit(1);
  }

  const data = JSON.parse(readFileSync(INPUT_FILE, 'utf-8'));
  const today = new Date().toISOString().split('T')[0];

  // Categorize PRs
  const buckets = {
    PROMOTE_NOW: [],
    FIX_TO_PROMOTE: [],
    NEEDS_OWNER: [],
    STALE_CLOSE_CANDIDATE: []
  };

  for (const pr of data) {
    const bucket = categorizePR(pr);
    buckets[bucket].push(pr);
  }

  // Generate summary markdown
  let summary = `# Draft PR Summary\n`;
  summary += `**Generated:** ${new Date().toISOString()}\n`;
  summary += `**Total Draft PRs:** ${data.length}\n\n`;

  summary += `## Statistics\n`;
  summary += `| Bucket | Count |\n|--------|-------|\n`;
  for (const [bucket, prs] of Object.entries(buckets)) {
    summary += `| ${bucket} | ${prs.length} |\n`;
  }
  summary += '\n';

  summary += `## All Draft PRs\n\n`;
  summary += `| # | Title | Author | Updated | Mergeable | Checks | Bucket |\n`;
  summary += `|---|-------|--------|---------|-----------|--------|--------|\n`;

  for (const pr of data) {
    const bucket = categorizePR(pr);
    const checkStatus = getCheckStatus(pr.statusCheckRollup);
    summary += `| [#${pr.number}](${pr.url}) | ${pr.title.substring(0, 50)}${pr.title.length > 50 ? '...' : ''} | ${pr.author.login} | ${formatDate(pr.updatedAt)} | ${pr.mergeable || 'N/A'} | ${checkStatus} | ${bucket} |\n`;
  }

  writeFileSync(join(REPORTS_DIR, `DRAFTS_SUMMARY_${today}.md`), summary);
  console.log(`Written: ${REPORTS_DIR}/DRAFTS_SUMMARY_${today}.md`);

  // Generate triage scaffold
  let triage = `# Draft PR Triage\n`;
  triage += `**Date:** ${today}\n`;
  triage += `**Release Captain:** [Your Name]\n\n`;

  for (const [bucket, prs] of Object.entries(buckets)) {
    triage += `## ${bucket} (${prs.length})\n\n`;
    if (prs.length === 0) {
      triage += `_None_\n\n`;
      continue;
    }
    for (const pr of prs) {
      triage += `### #${pr.number}: ${pr.title}\n`;
      triage += `- **Branch:** ${pr.headRefName}\n`;
      triage += `- **Author:** ${pr.author.login}\n`;
      triage += `- **Updated:** ${formatDate(pr.updatedAt)}\n`;
      triage += `- **Mergeable:** ${pr.mergeable || 'N/A'}\n`;
      triage += `- **Checks:** ${getCheckStatus(pr.statusCheckRollup)}\n`;
      triage += `- **URL:** ${pr.url}\n`;
      triage += `- **Rationale:** _TODO: Add rationale_\n\n`;
    }
  }

  writeFileSync(join(REPORTS_DIR, `TRIAGE_${today}.md`), triage);
  console.log(`Written: ${REPORTS_DIR}/TRIAGE_${today}.md`);
}

main();
