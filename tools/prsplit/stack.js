import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { Octokit } from '@octokit/rest';

const SAFE_REF_PATTERN = /^[A-Za-z0-9._/-]+$/;
const SAFE_AREA_PATTERN = /^[A-Za-z0-9._-]+$/;

export function assertSafeRef(ref, label) {
  if (!ref || !SAFE_REF_PATTERN.test(ref) || ref.startsWith('-') || ref.includes('..')) {
    throw new Error(`Unsafe ${label}: ${ref}`);
  }
  return ref;
}

export function assertSafeArea(area) {
  if (!area || !SAFE_AREA_PATTERN.test(area)) {
    throw new Error(`Unsafe area name: ${area}`);
  }
  return area;
}

export function assertSafePath(filePath) {
  if (
    !filePath ||
    typeof filePath !== 'string' ||
    filePath.startsWith('/') ||
    filePath.startsWith('-') ||
    filePath.includes('..')
  ) {
    throw new Error(`Unsafe file path: ${filePath}`);
  }
  return filePath;
}

function runGit(args) {
  const result = spawnSync('git', args, { encoding: 'utf8' });
  if (result.status !== 0) {
    const stderr = (result.stderr || '').trim();
    throw new Error(`git ${args.join(' ')} failed: ${stderr}`);
  }
  return (result.stdout || '').trim();
}

export function parseRepository(value) {
  if (!value || !value.includes('/')) {
    throw new Error('GITHUB_REPOSITORY must be set as owner/repo');
  }
  const [owner, repo] = value.split('/');
  if (!owner || !repo) {
    throw new Error('Invalid GITHUB_REPOSITORY format');
  }
  return { owner, repo };
}

async function main() {
  const gh = new Octokit({ auth: process.env.GH_TOKEN });
  const { owner, repo } = parseRepository(process.env.GITHUB_REPOSITORY);
  const areas = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  const base = assertSafeRef(process.env.BASE || 'main', 'base ref');
  const head = assertSafeRef(runGit(['rev-parse', '--abbrev-ref', 'HEAD']), 'head ref');

  let prev = base;
  const links = [];

  for (const [rawArea, rawFiles] of Object.entries(areas)) {
    const area = assertSafeArea(rawArea);
    const files = rawFiles.map(assertSafePath);
    const branch = assertSafeRef(`stack/${area}`, 'stack branch');

    runGit(['checkout', '-B', branch, `origin/${base}`]);
    runGit(['checkout', head, '--', ...files]);
    runGit(['commit', '-m', `stack(${area}): slice`]);
    runGit(['push', '-u', 'origin', branch, '--force-with-lease']);

    const pr = await gh.pulls.create({
      owner,
      repo,
      head: branch,
      base: prev,
      title: `Stack: ${area}`,
      body: `Slice from #${process.env.PR_NUMBER || ''}`,
    });

    links.push(`#${pr.data.number}`);
    prev = branch;
  }

  if (process.env.PR_NUMBER) {
    await gh.issues.createComment({
      owner,
      repo,
      issue_number: Number(process.env.PR_NUMBER),
      body: `Stack created: ${links.join(' → ')}`,
    });
  }
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isDirectRun) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  });
}
