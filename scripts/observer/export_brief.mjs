import { execSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

const args = process.argv.slice(2);

const options = {
  datasetIds: [],
  tags: [],
  queryLog: null,
  slug: null,
};

let inputPath = null;

for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  if (arg === '--dataset-id') {
    const value = args[i + 1];
    if (!value) {
      throw new Error('Missing value for --dataset-id');
    }
    options.datasetIds.push(value);
    i += 1;
    continue;
  }
  if (arg === '--tag') {
    const value = args[i + 1];
    if (!value) {
      throw new Error('Missing value for --tag');
    }
    options.tags.push(value);
    i += 1;
    continue;
  }
  if (arg === '--query-log') {
    const value = args[i + 1];
    if (!value) {
      throw new Error('Missing value for --query-log');
    }
    options.queryLog = value;
    i += 1;
    continue;
  }
  if (arg === '--slug') {
    const value = args[i + 1];
    if (!value) {
      throw new Error('Missing value for --slug');
    }
    options.slug = value;
    i += 1;
    continue;
  }
  if (!inputPath) {
    inputPath = arg;
    continue;
  }
}

if (!inputPath) {
  console.error(
    'Usage: node scripts/observer/export_brief.mjs <investigation.md> [--dataset-id <id>] [--tag <tag>] [--slug <slug>] [--query-log <path>]',
  );
  process.exit(1);
}

const timestamp = new Date().toISOString();
const outputTimestamp = timestamp.replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');

const resolvedInput = path.resolve(inputPath);
const inputContent = await fs.readFile(resolvedInput, 'utf8');
const sourcePath = path.relative(process.cwd(), resolvedInput);

const slugBase = options.slug ?? path.basename(inputPath, path.extname(inputPath));
const slug = slugBase
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/(^-|-$)/g, '');

const outputDir = path.resolve('artifacts/observer/briefs');
await fs.mkdir(outputDir, { recursive: true });

let gitSha = 'unknown';
try {
  gitSha = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
} catch (error) {
  console.warn('Unable to resolve git SHA; using "unknown".');
}

const manifest = {
  slug,
  generated_at: timestamp,
  source_path: sourcePath,
  dataset_ids: options.datasetIds,
  tags: options.tags,
  git_sha: gitSha,
  query_log_path: options.queryLog
    ? path.relative(process.cwd(), path.resolve(options.queryLog))
    : null,
};

const briefHeader = [
  '# IntelGraph Observer Brief',
  `Generated: ${timestamp}`,
  `Source: ${sourcePath}`,
  `Dataset IDs: ${options.datasetIds.join(', ') || 'n/a'}`,
  `Git SHA: ${gitSha}`,
  `Tags: ${options.tags.join(', ') || 'n/a'}`,
  '',
].join('\n');

const briefBody = `${briefHeader}\n${inputContent.trim()}\n`;

const briefFilename = `BRIEF_${slug}_${outputTimestamp}.md`;
const manifestFilename = `BRIEF_${slug}_${outputTimestamp}.json`;

const briefPath = path.join(outputDir, briefFilename);
const manifestPath = path.join(outputDir, manifestFilename);

await fs.writeFile(briefPath, briefBody, 'utf8');
await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

console.log(`Brief written: ${briefPath}`);
console.log(`Manifest written: ${manifestPath}`);
