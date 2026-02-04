// Media provenance gate enforcement (Media Authenticity & Provenance)
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const MEDIA_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.svg',
  '.tif',
  '.tiff',
  '.mp4',
  '.mov',
  '.webm',
  '.mkv',
]);

const ASSET_ROOTS = [
  'public/',
  'apps/web/public/',
  'client/public/',
  'web/public/',
  'website/public/',
  'docs/marketing/',
  'website/src/app/(marketing)/',
];

type VerificationFailure = {
  file: string;
  message: string;
};

function parseArgs(): { baseRef?: string; headRef?: string } {
  const args = process.argv.slice(2);
  const result: { baseRef?: string; headRef?: string } = {};

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--base') {
      result.baseRef = args[i + 1];
      i += 1;
    }
    if (arg === '--head') {
      result.headRef = args[i + 1];
      i += 1;
    }
  }

  return result;
}

function gitRefExists(ref: string): boolean {
  try {
    execSync(`git rev-parse --verify ${ref}`, { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
}

function resolveBaseRef(cliBase?: string): string {
  if (cliBase) {
    return cliBase;
  }
  const envBase = process.env.GITHUB_BASE_REF;
  if (envBase) {
    const candidate = `origin/${envBase}`;
    if (gitRefExists(candidate)) {
      return candidate;
    }
  }
  if (gitRefExists('origin/main')) {
    return 'origin/main';
  }
  return 'HEAD~1';
}

function listChangedFiles(baseRef: string, headRef: string): string[] {
  const output = execSync(
    `git diff --name-only --diff-filter=AM ${baseRef}...${headRef}`,
    { encoding: 'utf8' },
  );
  return output
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line);
}

function isMediaAsset(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, '/');
  const extension = path.extname(normalized).toLowerCase();
  if (!MEDIA_EXTENSIONS.has(extension)) {
    return false;
  }
  return ASSET_ROOTS.some((root) => normalized.startsWith(root));
}

function hashFile(filePath: string): string {
  const hash = crypto.createHash('sha256');
  const data = fs.readFileSync(filePath);
  hash.update(data);
  return hash.digest('hex');
}

function loadJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function validateEvidence(mediaPath: string, evidenceDir: string): VerificationFailure[] {
  const failures: VerificationFailure[] = [];
  const reportPath = path.join(evidenceDir, 'report.json');
  const metricsPath = path.join(evidenceDir, 'metrics.json');
  const stampPath = path.join(evidenceDir, 'stamp.json');

  if (!fs.existsSync(reportPath)) {
    failures.push({
      file: mediaPath,
      message: `Missing report.json at ${path.relative(process.cwd(), reportPath)}`,
    });
  }
  if (!fs.existsSync(metricsPath)) {
    failures.push({
      file: mediaPath,
      message: `Missing metrics.json at ${path.relative(process.cwd(), metricsPath)}`,
    });
  }
  if (!fs.existsSync(stampPath)) {
    failures.push({
      file: mediaPath,
      message: `Missing stamp.json at ${path.relative(process.cwd(), stampPath)}`,
    });
  }

  if (failures.length > 0) {
    return failures;
  }

  const report = loadJson<{
    schemaVersion?: string;
    input?: { path?: string };
    media?: { sha256?: string };
    generatedAt?: string;
  }>(reportPath);
  const metrics = loadJson<{ schemaVersion?: string; generatedAt?: string }>(metricsPath);
  const stamp = loadJson<{ generatedAt?: string }>(stampPath);

  const expectedHash = hashFile(mediaPath);
  if (report.media?.sha256 !== expectedHash) {
    failures.push({
      file: mediaPath,
      message: 'report.json sha256 does not match asset hash',
    });
  }

  if (!report.schemaVersion) {
    failures.push({
      file: mediaPath,
      message: 'report.json missing schemaVersion',
    });
  }

  if (report.input?.path !== path.relative(process.cwd(), mediaPath)) {
    failures.push({
      file: mediaPath,
      message: 'report.json input.path does not match asset path',
    });
  }

  if (metrics.generatedAt) {
    failures.push({
      file: mediaPath,
      message: 'metrics.json must not include generatedAt (deterministic output)',
    });
  }

  if (report.generatedAt) {
    failures.push({
      file: mediaPath,
      message: 'report.json must not include generatedAt (deterministic output)',
    });
  }

  if (!stamp.generatedAt) {
    failures.push({
      file: mediaPath,
      message: 'stamp.json must include generatedAt timestamp',
    });
  }

  return failures;
}

function main(): void {
  const args = parseArgs();
  const baseRef = resolveBaseRef(args.baseRef);
  const headRef = args.headRef ?? 'HEAD';

  const changedFiles = listChangedFiles(baseRef, headRef);
  const mediaFiles = changedFiles.filter(isMediaAsset);

  if (mediaFiles.length === 0) {
    console.log('Media provenance gate: no marketing/public media assets changed.');
    return;
  }

  const failures: VerificationFailure[] = [];

  for (const file of mediaFiles) {
    const evidenceDir = path.join(process.cwd(), 'evidence', 'media', file);
    failures.push(...validateEvidence(file, evidenceDir));
  }

  if (failures.length > 0) {
    console.error('Media provenance gate failed.');
    failures.forEach((failure) => {
      console.error(`- ${failure.file}: ${failure.message}`);
    });
    process.exit(1);
  }

  console.log('Media provenance gate passed.');
}

main();
