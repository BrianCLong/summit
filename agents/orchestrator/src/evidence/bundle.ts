import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { PlanIR, TraceEvent, EvidenceBundleManifest } from './types.js';

export interface EvidenceBundleConfig {
  bundlesDir: string;
  bundleVersion?: string;
  configFlags?: Record<string, unknown>;
  now?: () => Date;
  bundleId?: string;
}

export class EvidenceBundleWriter {
  private plan: PlanIR;
  private config: EvidenceBundleConfig;
  private bundleDir: string;
  private tracePath: string;
  private planPath: string;
  private artifactsDir: string;
  private now: () => Date;
  private createdAt?: string;

  constructor(plan: PlanIR, config: EvidenceBundleConfig) {
    this.plan = plan;
    this.config = config;
    this.now = config.now ?? (() => new Date());
    const bundleId = config.bundleId ?? `${plan.run_id}-${plan.plan_id}`;
    this.bundleDir = path.join(config.bundlesDir, bundleId);
    this.tracePath = path.join(this.bundleDir, 'trace.ndjson');
    this.planPath = path.join(this.bundleDir, 'plan.json');
    this.artifactsDir = path.join(this.bundleDir, 'artifacts');
  }

  getBundleDir(): string {
    return this.bundleDir;
  }

  async initialize(): Promise<void> {
    this.createdAt = this.now().toISOString();
    await fs.mkdir(this.artifactsDir, { recursive: true });
    await fs.writeFile(this.planPath, stableStringify(this.plan), 'utf8');
    await fs.writeFile(this.tracePath, '', 'utf8');
  }

  async record(event: TraceEvent): Promise<void> {
    const line = `${stableStringifyLine(event)}\n`;
    await fs.appendFile(this.tracePath, line, 'utf8');
  }

  async finalize(): Promise<EvidenceBundleManifest> {
    const createdAt = this.createdAt ?? this.now().toISOString();
    const files = await collectFiles(this.bundleDir);
    const manifest: EvidenceBundleManifest = {
      bundle_version: this.config.bundleVersion ?? '1.0',
      plan_id: this.plan.plan_id,
      run_id: this.plan.run_id,
      created_at: createdAt,
      finalized_at: this.now().toISOString(),
      git_sha: resolveGitSha(),
      config_flags: this.config.configFlags ?? {},
      files,
    };

    const manifestPath = path.join(this.bundleDir, 'manifest.json');
    await fs.writeFile(manifestPath, stableStringify(manifest), 'utf8');
    return manifest;
  }
}

async function collectFiles(bundleDir: string): Promise<EvidenceBundleManifest['files']> {
  const entries: EvidenceBundleManifest['files'] = [];
  const walk = async (dir: string) => {
    const items = await fs.readdir(dir, { withFileTypes: true });
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      if (item.isDirectory()) {
        await walk(fullPath);
      } else {
        const relPath = path.relative(bundleDir, fullPath);
        if (relPath === 'manifest.json') {
          continue;
        }
        const bytes = (await fs.stat(fullPath)).size;
        const sha256 = await hashFile(fullPath);
        entries.push({ path: relPath, sha256, bytes });
      }
    }
  };

  await walk(bundleDir);
  return entries.sort((a, b) => a.path.localeCompare(b.path));
}

async function hashFile(filePath: string): Promise<string> {
  const data = await fs.readFile(filePath);
  return createHash('sha256').update(data).digest('hex');
}

function resolveGitSha(): string {
  return (
    process.env.GIT_SHA ||
    process.env.GITHUB_SHA ||
    process.env.CI_COMMIT_SHA ||
    'unknown'
  );
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(value, sortKeys, 2) + '\n';
}

export function stableStringifyLine(value: unknown): string {
  return JSON.stringify(value, sortKeys);
}

function sortKeys(_key: string, value: unknown): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return value;
  }

  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(value as Record<string, unknown>).sort()) {
    sorted[key] = (value as Record<string, unknown>)[key];
  }
  return sorted;
}
