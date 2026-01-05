import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import crypto from 'node:crypto';

const ARTIFACTS_DIR = path.resolve('dist/release');

function run(cmd: string): string {
  try {
    return execSync(cmd, { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch (e) {
    return '';
  }
}

function getPreviousTag(currentTag: string): string | null {
  const output = run('git tag --sort=-creatordate');
  if (!output) return null;

  const tags = output.split('\n')
    .map(t => t.trim())
    .filter(t => t.startsWith('v'));

  const currentIndex = tags.indexOf(currentTag);
  if (currentIndex === -1) {
      return tags.length > 0 ? tags[0] : null;
  }

  if (currentIndex < tags.length - 1) {
    return tags[currentIndex + 1];
  }
  return null;
}

function getChangelogNotes(tag: string): string | null {
  const changelogPath = path.resolve('CHANGELOG.md');
  if (!fs.existsSync(changelogPath)) return null;

  const content = fs.readFileSync(changelogPath, 'utf-8');
  const version = tag.startsWith('v') ? tag.slice(1) : tag;
  const headerStart = `## [${version}]`;

  const lines = content.split(/\r?\n/);
  let startIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith(headerStart)) {
      startIndex = i;
      break;
    }
  }

  if (startIndex === -1) return null;

  const resultLines = [];
  resultLines.push(lines[startIndex]);

  for (let i = startIndex + 1; i < lines.length; i++) {
    if (lines[i].startsWith('## [')) {
      break;
    }
    resultLines.push(lines[i]);
  }

  return resultLines.join('\n').trim();
}

function generateGitLogNotes(prevTag: string | null, currentTag: string): string {
  const rangeArg = prevTag ? `${prevTag}..HEAD` : 'HEAD';
  const log = run(`git log ${rangeArg} --pretty=format:"- %s (%h)" -n 200`);
  const title = `## Release ${currentTag}`;
  const comparison = prevTag ? `\n\nChanges since ${prevTag}:` : '\n\nInitial release changes:';
  return `${title}${comparison}\n\n${log}`;
}

async function main() {
  const tag = process.env.TAG || process.env.GITHUB_REF_NAME;

  if (!tag) {
    console.error('Error: No tag provided via TAG or GITHUB_REF_NAME environment variables.');
    process.exit(1);
  }

  console.log(`Generating artifacts for tag: ${tag}`);

  if (!fs.existsSync(ARTIFACTS_DIR)) {
    fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
  }

  const prevTag = getPreviousTag(tag);
  console.log(`Previous tag determined: ${prevTag || 'None'}`);

  let notes = getChangelogNotes(tag);
  if (notes) {
    console.log('Release notes extracted from CHANGELOG.md');
  } else {
    console.log('Release notes not found in CHANGELOG.md, falling back to git log.');
    notes = generateGitLogNotes(prevTag, tag);
  }

  const notesPath = path.join(ARTIFACTS_DIR, 'release-notes.md');
  fs.writeFileSync(notesPath, notes);

  const manifest = {
    tag,
    previousTag: prevTag,
    commitSha: process.env.GITHUB_SHA || run('git rev-parse HEAD'),
    runId: process.env.GITHUB_RUN_ID,
    runUrl: process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY && process.env.GITHUB_RUN_ID
      ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
      : undefined,
    timestamp: new Date().toISOString(),
    generator: 'create-release-artifacts.ts'
  };

  const manifestPath = path.join(ARTIFACTS_DIR, 'release-manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  const filesToHash = ['release-notes.md', 'release-manifest.json'];
  const checksumsLines: string[] = [];

  for (const filename of filesToHash) {
    const filePath = path.join(ARTIFACTS_DIR, filename);
    const fileBuffer = fs.readFileSync(filePath);
    const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    checksumsLines.push(`${hash}  ${filename}`);
  }

  const checksumsPath = path.join(ARTIFACTS_DIR, 'SHA256SUMS');
  fs.writeFileSync(checksumsPath, checksumsLines.join('\n'));

  console.log(`Artifacts generated in ${ARTIFACTS_DIR}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
