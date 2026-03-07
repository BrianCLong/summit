import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { listFilesRecursively, toPosixRelative, writeJsonFile, writeTextFile } from './io';
import { renderFlowMermaid } from './mermaid';
import type { FlowDoc, FlowEdge } from './types';

interface Endpoint {
  method: string;
  path: string;
  source: string;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function loadOpenApiDocuments(workspace: string): Endpoint[] {
  const openApiFiles = listFilesRecursively(workspace, {
    include: /openapi.*\.(json|ya?ml)$/i,
    exclude: /node_modules|\.git|dist|build|coverage/i,
  });

  const endpoints: Endpoint[] = [];

  for (const file of openApiFiles) {
    const raw = fs.readFileSync(file, 'utf8');
    let parsed: unknown;

    try {
      parsed = file.endsWith('.json') ? JSON.parse(raw) : yaml.load(raw);
    } catch {
      continue;
    }

    const pathsRecord = (parsed as { paths?: unknown })?.paths;
    if (!pathsRecord || typeof pathsRecord !== 'object') {
      continue;
    }

    for (const [endpointPath, methods] of Object.entries(pathsRecord)) {
      if (!methods || typeof methods !== 'object') {
        continue;
      }

      for (const method of Object.keys(methods as Record<string, unknown>)) {
        const normalizedMethod = method.toUpperCase();
        if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'].includes(normalizedMethod)) {
          continue;
        }

        endpoints.push({
          method: normalizedMethod,
          path: endpointPath,
          source: toPosixRelative(workspace, file),
        });
      }
    }
  }

  return endpoints.sort((a, b) => `${a.method} ${a.path}`.localeCompare(`${b.method} ${b.path}`));
}

function flowForEndpoint(endpoint: Endpoint): FlowDoc {
  const slug = slugify(`${endpoint.method}-${endpoint.path}`);
  const flowId = `FLOW:${slug}:v1`;

  const edges: FlowEdge[] = [
    {
      id: `FLOWEDGE:${slug}:1`,
      from: `UI ${endpoint.path}`,
      to: `BFF ${endpoint.method} ${endpoint.path}`,
      kind: 'http',
      evidence: [`${endpoint.source}#${endpoint.path}:${endpoint.method}`],
      confidence: 'medium',
    },
    {
      id: `FLOWEDGE:${slug}:2`,
      from: `BFF ${endpoint.method} ${endpoint.path}`,
      to: `API ${endpoint.method} ${endpoint.path}`,
      kind: 'http',
      evidence: [`${endpoint.source}#${endpoint.path}:${endpoint.method}`],
      confidence: 'medium',
    },
  ];

  return {
    id: flowId,
    name: `${endpoint.method} ${endpoint.path}`,
    entrypoints: [{ uiPath: endpoint.path, httpPath: endpoint.path }],
    edges,
  };
}

function fallbackFlow(): FlowDoc {
  const slug = 'workspace-bootstrap';
  return {
    id: `FLOW:${slug}:v1`,
    name: 'Workspace bootstrap flow',
    entrypoints: [{ uiPath: '/', httpPath: '/health' }],
    edges: [
      {
        id: `FLOWEDGE:${slug}:1`,
        from: 'UI /',
        to: 'Unknown service',
        kind: 'unknown',
        evidence: ['workspace-scan:empty-openapi-catalog'],
        confidence: 'low',
      },
    ],
  };
}

function flowSlugFromId(flowId: string): string {
  return flowId.replace(/^FLOW:/, '').replace(/:v\d+$/, '');
}

export interface GenerateOptions {
  workspace: string;
  out: string;
}

export function generateFlows(options: GenerateOptions): FlowDoc[] {
  const workspace = path.resolve(options.workspace);
  const outDir = path.resolve(options.out);

  const endpoints = loadOpenApiDocuments(workspace);
  const flows = (endpoints.length > 0 ? endpoints.map(flowForEndpoint) : [fallbackFlow()]).sort((a, b) =>
    a.id.localeCompare(b.id),
  );

  writeJsonFile(path.join(outDir, 'flows.json'), {
    version: 'v1',
    flows,
  });

  const indexLines: string[] = ['# Living Architecture Flows', '', '| Flow ID | Name |', '| --- | --- |'];

  for (const flow of flows) {
    const slug = flowSlugFromId(flow.id);
    const flowDir = path.join(outDir, 'flows', slug);
    const diagramPath = path.join(flowDir, 'diagram.mmd');
    const readmePath = path.join(flowDir, 'README.md');

    writeTextFile(diagramPath, renderFlowMermaid(flow));
    writeTextFile(
      readmePath,
      `# ${flow.name}\n\n- **Flow ID:** ${flow.id}\n- **Entrypoints:** ${flow.entrypoints
        .map((entry) => `${entry.uiPath ?? '-'} | ${entry.httpPath ?? '-'}`)
        .join(', ')}\n`,
    );

    indexLines.push(`| ${flow.id} | ${flow.name} |`);
  }

  writeTextFile(path.join(outDir, 'index.md'), `${indexLines.join('\n')}\n`);

  return flows;
}
