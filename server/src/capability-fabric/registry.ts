import fs from 'node:fs';
import path from 'node:path';
import { CapabilityRegistry, CapabilitySpec } from './types.js';

function resolveRepoRoot(startDir: string): string {
  let current = startDir;
  while (current !== path.dirname(current)) {
    if (fs.existsSync(path.join(current, 'pnpm-workspace.yaml'))) {
      return current;
    }
    current = path.dirname(current);
  }
  return startDir;
}

function defaultRegistryPath(): string {
  const repoRoot = resolveRepoRoot(process.cwd());
  return path.join(repoRoot, 'capability-fabric', 'artifacts', 'capability-registry.json');
}

type RegistryCache = {
  path: string;
  mtimeMs: number;
  registry: CapabilityRegistry;
};

let registryCache: RegistryCache | null = null;

export function loadCapabilityRegistry(): CapabilityRegistry {
  const registryPath = process.env.CAPABILITY_REGISTRY_PATH || defaultRegistryPath();
  const stats = fs.statSync(registryPath);

  if (registryCache && registryCache.path === registryPath && registryCache.mtimeMs === stats.mtimeMs) {
    return registryCache.registry;
  }

  const raw = fs.readFileSync(registryPath, 'utf8');
  const parsed = JSON.parse(raw) as CapabilityRegistry;

  registryCache = {
    path: registryPath,
    mtimeMs: stats.mtimeMs,
    registry: parsed,
  };

  return parsed;
}

export function resolveCapabilityByMcp(
  registry: CapabilityRegistry,
  server: string,
  tool: string,
): CapabilitySpec | null {
  const candidates = registry.capabilities.filter((capability) =>
    capability.matchers?.some((matcher) => matcher.type === 'mcp_tool'),
  );

  for (const capability of candidates) {
    const match = capability.matchers?.find((matcher) => {
      if (matcher.type !== 'mcp_tool') return false;
      const serverMatch = matcher.server === '*' || matcher.server === server;
      const toolMatch = matcher.tool === '*' || matcher.tool === tool;
      return serverMatch && toolMatch;
    });
    if (match) {
      return capability;
    }
  }

  return null;
}

export function resolveCapabilityByHttp(
  registry: CapabilityRegistry,
  method: string,
  pathValue: string,
): CapabilitySpec | null {
  const candidates = registry.capabilities.filter((capability) =>
    capability.matchers?.some((matcher) => matcher.type === 'http_endpoint'),
  );

  for (const capability of candidates) {
    const match = capability.matchers?.find((matcher) => {
      if (matcher.type !== 'http_endpoint') return false;
      const methodMatch =
        !matcher.method || matcher.method.toLowerCase() === method.toLowerCase();
      const pathMatch = matcher.path === pathValue;
      return methodMatch && pathMatch;
    });
    if (match) {
      return capability;
    }
  }

  return null;
}
