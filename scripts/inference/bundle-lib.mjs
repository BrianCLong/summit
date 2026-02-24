import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

export const MANIFEST_SCHEMA = 'summit.inference.bundle.v1';
export const EVIDENCE_SCHEMA = 'summit.inference.evidence.v1';

export function stableStringify(value) {
  return `${JSON.stringify(canonicalize(value))}\n`;
}

function canonicalize(value) {
  if (Array.isArray(value)) {
    return value.map((item) => canonicalize(item));
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value)
      .filter(([, entryValue]) => entryValue !== undefined)
      .sort(([a], [b]) => a.localeCompare(b));
    return Object.fromEntries(
      entries.map(([key, entryValue]) => [key, canonicalize(entryValue)]),
    );
  }
  return value;
}

export function hashString(content) {
  return createHash('sha256').update(content).digest('hex');
}

export async function hashFile(filePath) {
  const data = await fs.readFile(filePath);
  return createHash('sha256').update(data).digest('hex');
}

export async function readFixtureConfig(fixtureDir) {
  const configPath = path.join(fixtureDir, 'bundle.config.json');
  const raw = await fs.readFile(configPath, 'utf8');
  return JSON.parse(raw);
}

export async function resolveFixtureEntries(fixtureDir, includePaths) {
  const entries = [];
  for (const relativePath of includePaths) {
    if (path.isAbsolute(relativePath)) {
      throw new Error(`Absolute paths are not allowed: ${relativePath}`);
    }
    const normalized = path.normalize(relativePath);
    if (normalized.startsWith('..')) {
      throw new Error(`Path traversal is not allowed: ${relativePath}`);
    }
    const resolved = path.join(fixtureDir, normalized);
    const stats = await fs.lstat(resolved);
    if (stats.isSymbolicLink()) {
      throw new Error(`Symlinks are not allowed: ${relativePath}`);
    }
    if (!stats.isFile()) {
      throw new Error(`Only files are allowed: ${relativePath}`);
    }
    entries.push({
      relativePath: normalized.replace(/\\/g, '/'),
      absolutePath: resolved,
    });
  }
  return entries;
}

export async function buildManifest(entrypoints, entries, parameters = {}) {
  const entryMap = {};
  const entryLookup = new Map(entries.map((entry) => [entry.relativePath, entry]));
  for (const [name, relativePath] of Object.entries(entrypoints)) {
    const entry = entryLookup.get(relativePath);
    if (!entry) {
      throw new Error(`Entrypoint path not in include list: ${relativePath}`);
    }
    entryMap[name] = {
      path: relativePath,
      sha256: await hashFile(entry.absolutePath),
    };
  }
  return {
    schema: MANIFEST_SCHEMA,
    entrypoints: entryMap,
    parameters,
  };
}

export async function writeDeterministicFile(filePath, content) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, 'utf8');
  await fs.chmod(filePath, 0o644);
}

export async function copyFixtureEntries(stagingDir, entries) {
  for (const entry of entries) {
    const destination = path.join(stagingDir, entry.relativePath);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.copyFile(entry.absolutePath, destination);
    await fs.chmod(destination, 0o644);
  }
}
