#!/usr/bin/env node

import { promises as fs } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {
  ensureDir,
  loadPolicy,
  parseArgs,
  readJson,
  resolveRepo,
  resolveTimestamp,
  toSlug,
  writeJson,
} from './stabilization-utils.mjs';

const DEFAULT_OUT_DIR = 'artifacts/stabilization/roadmap-handoff';
const DEFAULT_CANDIDATES_PATH =
  'artifacts/stabilization/roadmap-handoff/candidates_latest.json';

async function renderDraft(candidate, retroPath, windowWeeks) {
  const timestamp = new Date().toISOString();
  const slug = toSlug(candidate.slug);
  const marker = candidate.marker || `<!-- stabilization-roadmap:${slug} -->`;

  return [
    marker,
    `# Stabilization Roadmap Candidate: ${candidate.title}`,
    '',
    `**Slug:** ${slug}`,
    `**Generated:** ${timestamp}`,
    `**Window:** ${windowWeeks} week(s)`,
    '',
    '## Problem Statement',
    '',
    `${candidate.reason}.`,
    '',
    '## Evidence',
    '',
    `- Retrospective JSON: ${retroPath}`,
    '- Trigger details:',
    '```json',
    `${JSON.stringify(candidate.evidence || {}, null, 2)}`,
    '```',
    '',
    '## Proposed Scope',
    '',
    '- Systemic remediation to reduce recurrence (no new product features).',
    '',
    '## Acceptance Criteria',
    '',
    '- Document target movement in impacted metrics.',
    '- Verify improvements in next monthly retrospective.',
    '',
    '## Risks / Dependencies',
    '',
    '- Pending triage and ownership assignment.',
    '',
    '## Owner Routing',
    '',
    '- needs-triage',
    '',
  ].join('\n');
}

async function writeDrafts(candidates, retroPath, outDir, windowWeeks) {
  const draftsDir = path.join(outDir, 'drafts');
  await ensureDir(draftsDir);

  const written = [];
  for (const candidate of candidates) {
    const slug = toSlug(candidate.slug);
    const content = await renderDraft(candidate, retroPath, windowWeeks);
    const filePath = path.join(draftsDir, `ROADMAP_${slug}.md`);
    await fs.writeFile(filePath, content, 'utf8');
    written.push({ slug, filePath, title: candidate.title, reason: candidate.reason });
  }
  return written;
}

function renderDigest(entries) {
  const lines = entries.map(
    (entry) => `- ${entry.slug}: ${entry.title} — ${entry.reason}`,
  );
  return [
    '# Stabilization Roadmap Handoff Digest',
    '',
    ...lines,
    '',
  ].join('\n');
}

async function upsertIssues(candidates, retroPath, policy) {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (!token) {
    throw new Error('GITHUB_TOKEN or GH_TOKEN required for apply mode.');
  }
  const repo = resolveRepo();
  const baseLabels = policy.stabilization_roadmap_handoff.labels.base || [];
  const triageLabels = policy.stabilization_roadmap_handoff.labels.triage || [];
  const labels = [...new Set([...baseLabels, ...triageLabels])];

  for (const candidate of candidates) {
    const slug = toSlug(candidate.slug);
    const marker = candidate.marker || `<!-- stabilization-roadmap:${slug} -->`;
    const searchQuery = `repo:${repo.owner}/${repo.repo} in:body ${marker}`;
    const searchUrl = `https://api.github.com/search/issues?q=${encodeURIComponent(searchQuery)}`;
    const search = await fetch(searchUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
      },
    });
    const searchJson = await search.json();
    const existing = searchJson.items?.[0];
    const title = `[Stabilization] ${candidate.title}`;
    const body = await renderDraft(candidate, retroPath, 'n/a');

    if (existing) {
      await fetch(existing.url, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
        },
        body: JSON.stringify({ title, body, labels }),
      });
    } else {
      const createUrl = `https://api.github.com/repos/${repo.owner}/${repo.repo}/issues`;
      await fetch(createUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
        },
        body: JSON.stringify({ title, body, labels }),
      });
    }
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(`Usage: node scripts/releases/sync_stabilization_roadmap_handoff.mjs [options]

Options:
  --candidates <path>  Candidates JSON path
  --out-dir <dir>      Output directory (default: ${DEFAULT_OUT_DIR})
  --policy <path>      Policy YAML path
  --timestamp <ts>     Override timestamp token
`);
    process.exit(0);
  }

  const policy = await loadPolicy(args.policy);
  if (!policy.stabilization_roadmap_handoff.enabled) {
    console.log('Stabilization roadmap handoff disabled by policy.');
    return;
  }

  const candidatesPath = args.candidates || DEFAULT_CANDIDATES_PATH;
  const candidatesPayload = await readJson(candidatesPath);
  const candidates = candidatesPayload.candidates || [];
  const retroPath = candidatesPayload.retro_path || 'unknown';
  const outDir = args['out-dir'] || DEFAULT_OUT_DIR;

  if (!candidates.length) {
    console.log('No candidates to sync.');
    return;
  }

  await ensureDir(outDir);
  const entries = await writeDrafts(candidates, retroPath, outDir, candidatesPayload.window_weeks);

  const digest = renderDigest(entries);
  const digestPath = path.join(outDir, 'digest.md');
  await fs.writeFile(digestPath, digest, 'utf8');

  const timestamp = resolveTimestamp(args.timestamp);
  const summaryPath = path.join(outDir, `handoff_${timestamp}.json`);
  await writeJson(summaryPath, {
    generated_at: new Date().toISOString(),
    retro_path: retroPath,
    candidates: entries,
  });

  if (policy.stabilization_roadmap_handoff.mode === 'apply') {
    await upsertIssues(candidates, retroPath, policy);
  }

  console.log(`Roadmap handoff drafts written to ${outDir}`);
}

await main();
