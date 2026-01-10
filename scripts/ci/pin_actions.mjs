#!/usr/bin/env node
/* eslint-disable no-console */
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import https from 'node:https';

import { scanWorkflowText } from './action_pinning_gate.mjs';

const DEFAULT_WORKFLOWS_DIR = path.join(process.cwd(), '.github', 'workflows');

function parseArgs(argv) {
  const out = {
    workflowsDir: DEFAULT_WORKFLOWS_DIR,
    write: false,
    dryRun: false,
    help: false
  };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--workflows-dir') {
      out.workflowsDir = argv[i + 1] ?? out.workflowsDir;
      i += 1;
      continue;
    }
    if (arg === '--write') {
      out.write = true;
      continue;
    }
    if (arg === '--dry-run') {
      out.dryRun = true;
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      out.help = true;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }
  if (out.write && out.dryRun) {
    throw new Error('Choose only one: --write or --dry-run');
  }
  return out;
}

function isFullSha(ref) {
  return /^[0-9a-f]{40}$/i.test(ref);
}

function isLocalOrDocker(usesValue) {
  const value = usesValue.trim();
  if (value.startsWith('./')) return true;
  if (value.startsWith('docker://')) return true;
  return false;
}

function splitUses(usesValue) {
  const value = usesValue.trim();
  const atIndex = value.lastIndexOf('@');
  if (atIndex <= 0) return null;
  const left = value.slice(0, atIndex);
  const ref = value.slice(atIndex + 1);
  const parts = left.split('/');
  if (parts.length < 2) return null;
  return { owner: parts[0], repo: parts[1], left, ref };
}

function httpJson(url, headers) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      url,
      { method: 'GET', headers },
      (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf8');
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(body));
            } catch (error) {
              reject(
                new Error(`Failed to parse JSON from ${url}: ${error}`)
              );
            }
            return;
          }
          reject(
            new Error(
              `HTTP ${res.statusCode ?? 'unknown'} from ${url}: ${body.slice(0, 500)}`
            )
          );
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

export function createGitHubResolver({ token } = {}) {
  const headers = {
    'User-Agent': 'summit-ci-pin-actions',
    Accept: 'application/vnd.github+json'
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return async function resolveToSha({ owner, repo, ref }) {
    const url = `https://api.github.com/repos/${owner}/${repo}/commits/${encodeURIComponent(ref)}`;
    const data = await httpJson(url, headers);
    const sha = data?.sha;
    if (!sha || !isFullSha(sha)) {
      throw new Error(
        `Resolver returned invalid sha for ${owner}/${repo}@${ref}: ${String(sha)}`
      );
    }
    return sha;
  };
}

export async function pinWorkflowText({ text, fileRelPath, resolveToSha }) {
  const entries = scanWorkflowText(text, fileRelPath);

  const targets = new Map();
  for (const entry of entries) {
    if (!entry.uses) continue;
    if (isLocalOrDocker(entry.uses)) continue;
    const split = splitUses(entry.uses);
    if (!split) continue;
    if (split.ref.includes('${{')) continue;
    if (isFullSha(split.ref)) continue;
    targets.set(entry.uses, {
      owner: split.owner,
      repo: split.repo,
      ref: split.ref,
      left: split.left
    });
  }

  if (targets.size === 0) {
    return { changed: false, rewrittenText: text, rewrites: [] };
  }

  const rewrites = [];
  for (const [uses, target] of [...targets.entries()].sort((a, b) =>
    a[0].localeCompare(b[0])
  )) {
    const sha = await resolveToSha({
      owner: target.owner,
      repo: target.repo,
      ref: target.ref
    });
    rewrites.push({ from: uses, to: `${target.left}@${sha}` });
  }

  let rewritten = text;
  for (const rewrite of rewrites) {
    const escaped = rewrite.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const usesLine = new RegExp(`(^\\s*uses:\\s*)(${escaped})(\\s*$)`, 'gm');
    rewritten = rewritten.replace(usesLine, `$1${rewrite.to}$3`);
    const inlineLine = new RegExp(
      `(^\\s*-\\s*uses:\\s*)(${escaped})(\\s*$)`,
      'gm'
    );
    rewritten = rewritten.replace(inlineLine, `$1${rewrite.to}$3`);
  }

  return { changed: rewritten !== text, rewrittenText: rewritten, rewrites };
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    console.log(`Usage:
  node scripts/ci/pin_actions.mjs [--workflows-dir <dir>] [--write | --dry-run]

Defaults:
  --workflows-dir ${DEFAULT_WORKFLOWS_DIR}

Notes:
  - Uses GitHub API to resolve tags/branches to commit SHAs.
  - Set GITHUB_TOKEN to increase rate limit / access private action repos.
`);
    process.exit(0);
  }

  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || null;
  const resolveToSha = createGitHubResolver({ token });

  const dirents = await fs.readdir(args.workflowsDir, { withFileTypes: true });
  const workflowFiles = dirents
    .filter((dirent) => dirent.isFile())
    .map((dirent) => dirent.name)
    .filter((name) => name.endsWith('.yml') || name.endsWith('.yaml'))
    .sort((a, b) => a.localeCompare(b));

  let anyChanged = false;

  for (const fileName of workflowFiles) {
    const abs = path.join(args.workflowsDir, fileName);
    const rel = path
      .relative(process.cwd(), abs)
      .replaceAll(path.sep, '/');
    const text = await fs.readFile(abs, 'utf8');
    const result = await pinWorkflowText({
      text,
      fileRelPath: rel,
      resolveToSha
    });
    if (!result.changed) continue;

    anyChanged = true;
    console.log(`Rewrites in ${rel}:`);
    for (const rewrite of result.rewrites) {
      console.log(`  ${rewrite.from}  ->  ${rewrite.to}`);
    }

    if (args.dryRun) continue;

    if (args.write) {
      await fs.writeFile(abs, result.rewrittenText, 'utf8');
    }
  }

  if (!anyChanged) {
    console.log('No unpinned actions found to rewrite.');
    return;
  }

  if (args.dryRun) {
    console.log('Dry run complete. Re-run with --write to apply changes.');
    return;
  }

  if (args.write) {
    console.log('Rewrite complete. Review diffs, then run:');
    console.log('  node scripts/ci/action_pinning_gate.mjs');
    return;
  }

  console.log('Changes detected but not written. Use --write or --dry-run.');
  process.exit(1);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error?.stack ?? String(error));
    process.exit(2);
  });
}
