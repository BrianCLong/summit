import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { listFilesRecursively, toPosixRelative } from '../io';
import type { FlowDoc } from '../types';

export interface UnmappedEndpoint {
  method: string;
  path: string;
  source: string;
}

function parseOpenApiEndpoints(filePath: string): Array<{ method: string; path: string }> {
  const raw = fs.readFileSync(filePath, 'utf8');
  const parsed = filePath.endsWith('.json') ? JSON.parse(raw) : yaml.load(raw);
  const pathsRecord = parsed?.paths;
  if (!pathsRecord || typeof pathsRecord !== 'object') {
    return [];
  }

  const endpoints: Array<{ method: string; path: string }> = [];
  for (const [apiPath, methods] of Object.entries(pathsRecord as Record<string, unknown>)) {
    if (!methods || typeof methods !== 'object') {
      continue;
    }

    for (const method of Object.keys(methods as Record<string, unknown>)) {
      const normalizedMethod = method.toUpperCase();
      if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'].includes(normalizedMethod)) {
        continue;
      }

      endpoints.push({ method: normalizedMethod, path: apiPath });
    }
  }

  return endpoints;
}

export function findUnmappedEndpoints(workspace: string, flows: FlowDoc[]): UnmappedEndpoint[] {
  const openApiFiles = listFilesRecursively(workspace, {
    include: /openapi.*\.(json|ya?ml)$/i,
    exclude: /node_modules|\.git|dist|build|coverage/i,
  });

  const mapped = new Set<string>();
  for (const flow of flows) {
    for (const entry of flow.entrypoints) {
      if (entry.httpPath) {
        mapped.add(entry.httpPath);
      }
    }
  }

  const unmapped: UnmappedEndpoint[] = [];
  for (const file of openApiFiles) {
    let endpoints: Array<{ method: string; path: string }> = [];
    try {
      endpoints = parseOpenApiEndpoints(file);
    } catch {
      continue;
    }

    for (const endpoint of endpoints) {
      if (!mapped.has(endpoint.path)) {
        unmapped.push({
          method: endpoint.method,
          path: endpoint.path,
          source: toPosixRelative(workspace, file),
        });
      }
    }
  }

  return unmapped.sort((a, b) => `${a.method} ${a.path}`.localeCompare(`${b.method} ${b.path}`));
}
