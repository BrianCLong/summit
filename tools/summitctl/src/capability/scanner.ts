import fs from 'node:fs';
import path from 'node:path';
import yaml from 'yaml';
import { InventoryEntry } from './types';

const DEFAULT_IGNORES = new Set([
  '.git',
  'node_modules',
  'dist',
  'build',
  'coverage',
  'artifacts',
]);

const OPENAPI_EXTENSIONS = new Set(['.yaml', '.yml', '.json']);

function isDirectory(dirPath: string): boolean {
  return fs.statSync(dirPath).isDirectory();
}

function walk(dir: string, ignores = DEFAULT_IGNORES): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    if (ignores.has(entry.name)) {
      continue;
    }
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(entryPath, ignores));
    } else {
      files.push(entryPath);
    }
  }
  return files;
}

function parseOpenApi(filePath: string): Record<string, any> | null {
  const raw = fs.readFileSync(filePath, 'utf8');
  if (!raw.includes('openapi') && !raw.includes('swagger')) {
    return null;
  }
  try {
    if (filePath.endsWith('.json')) {
      return JSON.parse(raw);
    }
    return yaml.parse(raw);
  } catch {
    return null;
  }
}

export function scanOpenApi(rootDir: string): InventoryEntry[] {
  const files = walk(rootDir)
    .filter((file) => OPENAPI_EXTENSIONS.has(path.extname(file)))
    .sort();

  const inventory: InventoryEntry[] = [];

  for (const filePath of files) {
    const parsed = parseOpenApi(filePath);
    if (!parsed) {
      continue;
    }

    const name = parsed.info?.title ?? path.basename(filePath);
    const version = parsed.info?.version ?? undefined;
    const servers = Array.isArray(parsed.servers)
      ? parsed.servers.map((server: any) => server.url).filter(Boolean)
      : undefined;
    const operations = parsed.paths
      ? Object.keys(parsed.paths).reduce((count, route) => {
          const ops = parsed.paths[route];
          return count + (ops ? Object.keys(ops).length : 0);
        }, 0)
      : undefined;

    const capability_id = parsed['x-capability-id'] || parsed['x-capability'];

    inventory.push({
      id: path.relative(rootDir, filePath),
      name,
      type: 'openapi',
      source: filePath,
      version,
      servers,
      capability_id,
      operations,
    });
  }

  return inventory.sort((a, b) => a.id.localeCompare(b.id));
}

export function scanServiceCatalog(rootDir: string): InventoryEntry[] {
  const files = walk(rootDir).filter((file) => path.basename(file) === 'catalog-info.yaml');
  return files
    .map((filePath) => {
      const parsed = yaml.parse(fs.readFileSync(filePath, 'utf8')) as Record<string, any>;
      return {
        id: path.relative(rootDir, filePath),
        name: parsed?.metadata?.name ?? path.basename(filePath),
        type: 'service-manifest',
        source: filePath,
      } as InventoryEntry;
    })
    .sort((a, b) => a.id.localeCompare(b.id));
}

export function scanCapabilityAnnotations(rootDir: string): InventoryEntry[] {
  const files = walk(rootDir)
    .filter((file) => ['.ts', '.js', '.py'].includes(path.extname(file)))
    .sort();
  const entries: InventoryEntry[] = [];

  for (const filePath of files) {
    const raw = fs.readFileSync(filePath, 'utf8');
    const matches = raw.matchAll(/@capability\(([^)]+)\)/g);
    for (const match of matches) {
      const capabilityId = match[1].replace(/['"`]/g, '').trim();
      entries.push({
        id: `${path.relative(rootDir, filePath)}:${capabilityId}`,
        name: capabilityId,
        type: 'annotation',
        source: filePath,
        capability_id: capabilityId,
      });
    }
  }

  return entries.sort((a, b) => a.id.localeCompare(b.id));
}

export function scanGatewayConfigs(rootDir: string): InventoryEntry[] {
  const files = walk(rootDir)
    .filter((file) => file.includes('gateway') && OPENAPI_EXTENSIONS.has(path.extname(file)))
    .sort();
  const entries: InventoryEntry[] = [];

  for (const filePath of files) {
    const parsed = parseOpenApi(filePath);
    if (!parsed) {
      continue;
    }
    entries.push({
      id: path.relative(rootDir, filePath),
      name: parsed.info?.title ?? path.basename(filePath),
      type: 'gateway-config',
      source: filePath,
      version: parsed.info?.version,
    });
  }

  return entries.sort((a, b) => a.id.localeCompare(b.id));
}

export function scanInventory(rootDir: string): InventoryEntry[] {
  return [
    ...scanOpenApi(rootDir),
    ...scanServiceCatalog(rootDir),
    ...scanGatewayConfigs(rootDir),
    ...scanCapabilityAnnotations(rootDir),
  ].sort((a, b) => a.id.localeCompare(b.id));
}

export function resolveRepoRoot(startDir: string): string {
  let current = startDir;
  while (current !== path.dirname(current)) {
    if (fs.existsSync(path.join(current, 'pnpm-workspace.yaml'))) {
      return current;
    }
    current = path.dirname(current);
  }
  return startDir;
}

export function ensureDirectory(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function writeJson(filePath: string, payload: unknown): void {
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}
