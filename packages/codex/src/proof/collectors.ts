import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import fg from 'fast-glob';
import yaml from 'js-yaml';
import { stableHash, hashString } from './stableHash.js';
import type { Layer } from './types.js';

export async function collectToolchain(): Promise<Layer> {
  const nodeVersion = process.version;
  const pnpmVersion = execSync('pnpm -v', { encoding: 'utf-8' }).trim();
  const tscVersion = execSync('npx tsc -v', { encoding: 'utf-8' }).trim();

  // Optional docker digest if running in container
  let dockerDigest = 'none';
  // Attempt to find docker digest if applicable, e.g. via env vars or hostname check
  // For now we keep it simple as per spec

  const meta = {
    node: nodeVersion,
    pnpm: pnpmVersion,
    tsc: tscVersion,
    docker: dockerDigest,
    os: process.platform,
    arch: process.arch
  };

  const digest = stableHash([
    Buffer.from(JSON.stringify(meta))
  ]);

  return { name: 'toolchain', digest, meta };
}

export async function collectSource(pkgDir: string): Promise<Layer> {
  // Use fast-glob to respect gitignore logic would be ideal,
  // but simpler to use git ls-files if git is available.
  // Spec says: git tree + .gitattributes normalization

  let files: string[] = [];
  try {
    const output = execSync('git ls-files', { cwd: pkgDir, encoding: 'utf-8' });
    files = output.split('\n').filter(Boolean).map(f => f.trim());
  } catch (e) {
    // Fallback or error if not a git repo
    console.warn('Not a git repository, falling back to glob');
    files = await fg(['**/*'], { cwd: pkgDir, ignore: ['node_modules', 'dist', '.summit'] });
  }

  files.sort();

  const fileHashes: Buffer[] = [];
  const manifest: Record<string, string> = {};

  for (const file of files) {
    const fullPath = join(pkgDir, file);
    if (!existsSync(fullPath)) continue;

    // Normalize LF
    const content = readFileSync(fullPath);
    // Rough LF normalization for text files - simple replacement for now
    // In a real robust system we'd check mime type or .gitattributes
    // For now we hash raw bytes to be safe/exact

    const fileHash = stableHash([content]);
    fileHashes.push(Buffer.from(`${file}:${fileHash}`));
    manifest[file] = fileHash;
  }

  const digest = stableHash(fileHashes);

  return { name: 'source', digest, meta: { files: files.length, manifest } };
}

export async function collectDeps(pkgDir: string): Promise<Layer> {
  // Find lockfile. Assuming pnpm workspace root or local
  // We'll search up for pnpm-lock.yaml

  let lockPath = join(pkgDir, 'pnpm-lock.yaml');
  if (!existsSync(lockPath)) {
    // Try root
    lockPath = join(process.cwd(), 'pnpm-lock.yaml');
  }

  if (!existsSync(lockPath)) {
    return { name: 'deps', digest: stableHash([Buffer.from('no-lockfile')]), meta: { error: 'lockfile not found' } };
  }

  const lockContent = readFileSync(lockPath, 'utf-8');
  // Hash the lockfile content itself for strictness
  // Or parse it to extract resolved deps for this package
  // For v1 spec: "exact lockfile + resolved tarball digests"

  // We will hash the lockfile content as a baseline
  const digest = stableHash([Buffer.from(lockContent)]);

  return { name: 'deps', digest, meta: { lockfile: lockPath } };
}

export async function collectEnv(): Promise<Layer> {
  // Read allowlist .summit/env.allow
  const allowListPath = join(process.cwd(), '.summit/env.allow');
  const allowedKeys = existsSync(allowListPath)
    ? readFileSync(allowListPath, 'utf-8').split('\n').map(l => l.trim()).filter(Boolean)
    : ['NODE_ENV', 'CI']; // Default

  const envVars: Record<string, string> = {};
  for (const key of allowedKeys) {
    if (process.env[key]) {
      envVars[key] = process.env[key]!;
    }
  }

  // Also read .nvmrc if exists
  const nvmrcPath = join(process.cwd(), '.nvmrc');
  if (existsSync(nvmrcPath)) {
    envVars['.nvmrc'] = readFileSync(nvmrcPath, 'utf-8').trim();
  }

  const digest = stableHash([Buffer.from(JSON.stringify(envVars))]);
  return { name: 'env', digest, meta: envVars };
}

export async function collectSteps(commands: string[]): Promise<Layer> {
  // Normalize commands
  const normalized = commands.map(c => c.trim());
  const digest = stableHash([Buffer.from(JSON.stringify(normalized))]);
  return { name: 'steps', digest, meta: { commands: normalized } };
}

export async function collectArtifacts(outDir: string): Promise<{ layer: Layer, artifacts: Record<string, { digest: string, size: number }> }> {
  const files = await fg(['**/*'], { cwd: outDir, absolute: false });
  files.sort();

  const artifactDigests: Record<string, { digest: string, size: number }> = {};
  const hashBuffers: Buffer[] = [];

  for (const file of files) {
    const fullPath = join(outDir, file);
    const content = readFileSync(fullPath);
    const hash = stableHash([content]);
    artifactDigests[file] = { digest: hash, size: content.length };
    hashBuffers.push(Buffer.from(`${file}:${hash}`));
  }

  const digest = stableHash(hashBuffers);

  return {
    layer: { name: 'artifacts', digest, meta: { count: files.length } },
    artifacts: artifactDigests
  };
}
