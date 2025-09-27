#!/usr/bin/env ts-node
import { spawnSync } from 'child_process';
import { createHash } from 'crypto';
import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface CliOptions {
  config: string;
  python: string;
  output?: string;
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = { config: '', python: process.env.CLSL_PYTHON || 'python' };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--config') {
      options.config = argv[++index] ?? '';
    } else if (token === '--python') {
      options.python = argv[++index] ?? 'python';
    } else if (token === '--output') {
      options.output = argv[++index];
    }
  }

  if (!options.config) {
    throw new Error('Missing required --config argument');
  }

  return options;
}

function resolveOutput(configPath: string, requested?: string): string {
  if (requested) {
    return path.resolve(requested);
  }
  const payload = JSON.parse(readFileSync(configPath, 'utf-8'));
  const candidate = payload.output_dir ?? 'out';
  const baseDir = path.dirname(configPath);
  return path.resolve(baseDir, candidate);
}

function hashDirectory(dir: string): string {
  const digest = createHash('sha256');
  const entries = readdirSync(dir).sort();
  for (const entry of entries) {
    const fullPath = path.join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      digest.update(hashDirectory(fullPath));
    } else if (stats.isFile()) {
      digest.update(entry);
      digest.update(readFileSync(fullPath));
    }
  }
  return digest.digest('hex');
}

function main(): void {
  const argv = process.argv.slice(2);
  const options = parseArgs(argv);
  const configPath = path.resolve(options.config);
  const outputDir = resolveOutput(configPath, options.output);

  const runArgs = ['-m', 'clsl.cli', 'run', '--config', configPath, '--output', outputDir];
  const env = { ...process.env };
  const packageRoot = path.resolve(__dirname);
  let pythonPathEntry = packageRoot;
  if (!existsSync(path.join(pythonPathEntry, 'clsl'))) {
    pythonPathEntry = path.resolve(process.cwd(), 'tools/clsl');
  }
  env.PYTHONPATH = env.PYTHONPATH
    ? `${pythonPathEntry}${path.delimiter}${env.PYTHONPATH}`
    : pythonPathEntry;

  const result = spawnSync(options.python, runArgs, { stdio: 'inherit', env });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }

  const summaryPath = path.join(outputDir, 'summary.json');
  const summary = JSON.parse(readFileSync(summaryPath, 'utf-8')) as Array<{
    run: string;
    thresholds: Record<string, number>;
    auc: Record<string, number>;
    breakpoints: Record<string, Record<string, number>>;
  }>;

  const digest = hashDirectory(outputDir);

  const lines = summary.map((entry) => {
    const watermark = entry.breakpoints.watermark ?? {};
    const c2pa = entry.breakpoints.c2pa ?? {};
    return `${entry.run}: AUC(w=${entry.auc.watermark?.toFixed(3)}, c=${entry.auc.c2pa?.toFixed(3)}) ` +
      `watermarkBreakpoints=${Object.values(watermark).map((v) => v.toFixed(2)).join(',')} ` +
      `c2paBreakpoints=${Object.values(c2pa).map((v) => v.toFixed(2)).join(',')}`;
  });

  console.log('CLSL summary');
  for (const line of lines) {
    console.log(`  ${line}`);
  }
  console.log(`artifactDigest=${digest}`);
}

main();
