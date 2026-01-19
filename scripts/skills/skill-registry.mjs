import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import yaml from 'js-yaml';

export async function loadYaml(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  return yaml.load(raw);
}

export async function loadRegistry(registryPath) {
  const registry = await loadYaml(registryPath);
  if (!registry || registry.version !== 1) {
    throw new Error('Skill registry missing or unsupported version.');
  }
  return registry;
}

export async function loadPack(packPath) {
  const pack = await loadYaml(packPath);
  if (!pack || pack.version !== 1) {
    throw new Error('Skill pack missing or unsupported version.');
  }
  return pack;
}

export function resolveSource(registry, sourceId) {
  const sources = registry.registry?.allowlisted_sources ?? [];
  const source = sources.find((entry) => entry.id === sourceId);
  if (!source) {
    throw new Error(`Unknown skill source: ${sourceId}`);
  }
  return source;
}

export function resolveSkillDirectory({ registry, sourceId, skillPath }) {
  const source = resolveSource(registry, sourceId);
  const vendorRoot = source.vendor_path;
  if (!vendorRoot) {
    throw new Error(`Source ${sourceId} missing vendor_path.`);
  }
  return path.join(vendorRoot, skillPath.replace(/^skills\//, ''));
}

export async function listFilesRecursive(dirPath) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const resolved = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      const nested = await listFilesRecursive(resolved);
      files.push(...nested);
    } else if (entry.isFile()) {
      files.push(resolved);
    }
  }
  return files.sort();
}

export async function hashFile(filePath) {
  const data = await fs.readFile(filePath);
  return crypto.createHash('sha256').update(data).digest('hex');
}

export async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}
