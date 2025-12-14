import { promises as fs } from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { glob } from 'glob';
import { spawn } from 'child_process';

type NodeType = 'service' | 'package' | 'workflow';

type SystemNode = {
  id: string;
  name: string;
  type: NodeType;
  source: string;
  metadata?: Record<string, unknown>;
};

type Edge = {
  from: string;
  to: string;
  type: string;
  source: string;
  metadata?: Record<string, unknown>;
};

type ComposeResult = {
  nodes: SystemNode[];
  edges: Edge[];
  files: string[];
};

type WorkspacePackage = SystemNode & { path: string };

type WorkspaceResult = {
  nodes: WorkspacePackage[];
  edges: Edge[];
  patterns: string[];
};

type WorkflowResult = {
  nodes: SystemNode[];
  edges: Edge[];
};

const ROOT = process.cwd();
const OUTPUT_DIR = path.join(ROOT, 'docs', 'architecture');
const JSON_OUTPUT = path.join(OUTPUT_DIR, 'system-map.json');
const DOT_OUTPUT = path.join(OUTPUT_DIR, 'system-map.dot');
const PNG_OUTPUT = path.join(OUTPUT_DIR, 'system-map.png');

async function pathExists(target: string): Promise<boolean> {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

function ensureUnique<T extends { id: string }>(items: T[]): T[] {
  const seen = new Map<string, T>();
  items.forEach((item) => seen.set(item.id, { ...seen.get(item.id), ...item } as T));
  return Array.from(seen.values());
}

function toArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

async function loadCompose(): Promise<ComposeResult> {
  const candidates = [
    'docker-compose.yml',
    'docker-compose.dev.yml',
    'docker-compose.prod.yml',
    'docker-compose.override.yml',
    'docker-compose.observability.yml',
    path.join('server', 'docker-compose.dev.yml'),
    path.join('services', 'docker-compose.yml'),
  ];

  const files = (
    await Promise.all(
      candidates.map(async (candidate) => {
        const fullPath = path.join(ROOT, candidate);
        return (await pathExists(fullPath)) ? fullPath : null;
      })
    )
  ).filter(Boolean) as string[];

  const nodes: SystemNode[] = [];
  const edges: Edge[] = [];

  for (const file of files) {
    const raw = await fs.readFile(file, 'utf8');
    const parsed = yaml.load(raw) as { services?: Record<string, any> } | null;
    if (!parsed?.services) continue;

    for (const [serviceName, serviceValue] of Object.entries(parsed.services)) {
      const id = `service:${serviceName}`;
      const serviceNode: SystemNode = {
        id,
        name: serviceName,
        type: 'service',
        source: path.relative(ROOT, file),
        metadata: {
          image: serviceValue.image,
          dependsOn: serviceValue.depends_on ?? [],
          ports: serviceValue.ports ?? [],
        },
      };

      nodes.push(serviceNode);

      const dependencies = serviceValue.depends_on;
      if (dependencies) {
        const depList = Array.isArray(dependencies) ? dependencies : Object.keys(dependencies);
        depList.forEach((dep: string) => {
          edges.push({
            from: id,
            to: `service:${dep}`,
            type: 'service-depends',
            source: path.relative(ROOT, file),
          });
        });
      }
    }
  }

  return { nodes: ensureUnique(nodes), edges, files: files.map((file) => path.relative(ROOT, file)) };
}

async function loadWorkspacePackages(): Promise<WorkspaceResult> {
  const pnpmWorkspacePath = path.join(ROOT, 'pnpm-workspace.yaml');
  const packageJsonPath = path.join(ROOT, 'package.json');
  const patterns: string[] = [];

  if (await pathExists(pnpmWorkspacePath)) {
    const workspaceRaw = await fs.readFile(pnpmWorkspacePath, 'utf8');
    const workspaceDoc = yaml.load(workspaceRaw) as { packages?: string[] } | null;
    patterns.push(...(workspaceDoc?.packages ?? []));
  }

  if (await pathExists(packageJsonPath)) {
    const rootPkgRaw = await fs.readFile(packageJsonPath, 'utf8');
    const rootPkg = JSON.parse(rootPkgRaw) as { workspaces?: string[] | { packages?: string[] } };
    if (rootPkg.workspaces) {
      const pkgWorkspaces = Array.isArray(rootPkg.workspaces)
        ? rootPkg.workspaces
        : rootPkg.workspaces.packages ?? [];
      patterns.push(...pkgWorkspaces);
    }
  }

  const packageFiles = new Set<string>();
  for (const pattern of patterns) {
    const matches = await glob(path.join(ROOT, pattern, 'package.json'));
    matches.forEach((match) => packageFiles.add(match));
  }

  if (await pathExists(packageJsonPath)) {
    packageFiles.add(packageJsonPath);
  }

  const nodes: WorkspacePackage[] = [];
  const edges: Edge[] = [];

  for (const file of Array.from(packageFiles)) {
    const pkgRaw = await fs.readFile(file, 'utf8');
    const pkg = JSON.parse(pkgRaw) as { name?: string; dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
    const pkgName = pkg.name ?? path.basename(path.dirname(file));
    const id = `package:${pkgName}`;
    const relativePath = path.relative(ROOT, path.dirname(file)) || '.';

    nodes.push({
      id,
      name: pkgName,
      type: 'package',
      source: relativePath,
      path: relativePath,
      metadata: {
        dependencies: Object.keys(pkg.dependencies ?? {}),
        devDependencies: Object.keys(pkg.devDependencies ?? {}),
      },
    });
  }

  const nodeIndex = new Map(nodes.map((pkg) => [pkg.name, pkg.id]));

  for (const pkg of nodes) {
    const dependencies = [
      ...((pkg.metadata?.dependencies as string[]) ?? []),
      ...((pkg.metadata?.devDependencies as string[]) ?? []),
    ];
    dependencies
      .filter((dep) => nodeIndex.has(dep))
      .forEach((dep) => {
        edges.push({
          from: pkg.id,
          to: nodeIndex.get(dep) as string,
          type: 'package-depends',
          source: pkg.source,
        });
      });
  }

  return { nodes: ensureUnique(nodes), edges, patterns };
}

function flattenPaths(onConfig: any): string[] {
  if (!onConfig || typeof onConfig !== 'object') return [];
  const entries = Array.isArray(onConfig) ? onConfig : [onConfig];
  const paths: string[] = [];

  entries.forEach((entry) => {
    if (typeof entry !== 'object') return;
    for (const value of Object.values(entry)) {
      if (value && typeof value === 'object') {
        const candidatePaths = toArray((value as any).paths);
        paths.push(...candidatePaths.filter((candidate) => typeof candidate === 'string'));
      }
    }
  });

  return Array.from(new Set(paths));
}

async function loadWorkflows(packageNodes: WorkspacePackage[], serviceNodes: SystemNode[]): Promise<WorkflowResult> {
  const workflowFiles = await glob(path.join(ROOT, '.github', 'workflows', '*.yml'));
  const nodes: SystemNode[] = [];
  const edges: Edge[] = [];

  for (const file of workflowFiles) {
    const raw = await fs.readFile(file, 'utf8');
    let documents: any[] = [];
    try {
      documents = yaml.loadAll(raw) as any[];
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn(`Skipping workflow parsing for ${file}: ${(error as Error).message}`);
      continue;
    }

    const [firstDoc] = documents;
    const workflowName = firstDoc?.name ?? path.basename(file, '.yml');
    const workflowId = `workflow:${workflowName}`;

    nodes.push({
      id: workflowId,
      name: workflowName,
      type: 'workflow',
      source: path.relative(ROOT, file),
      metadata: { on: firstDoc?.on ? Object.keys(firstDoc.on) : [] },
    });

    const paths = flattenPaths(firstDoc?.on);
    const jobs = firstDoc?.jobs ?? {};

    packageNodes.forEach((pkg) => {
      if (paths.some((p) => p.startsWith(pkg.path))) {
        edges.push({
          from: workflowId,
          to: pkg.id,
          type: 'workflow-monitors-package',
          source: path.relative(ROOT, file),
          metadata: { path: pkg.path },
        });
      }
    });

    Object.values(jobs).forEach((job: any) => {
      if (!job?.services) return;
      Object.keys(job.services).forEach((svcName) => {
        const targetId = serviceNodes.find((node) => node.name === svcName)?.id ?? `service:${svcName}`;
        edges.push({
          from: workflowId,
          to: targetId,
          type: 'workflow-job-service',
          source: path.relative(ROOT, file),
        });
      });
    });
  }

  return { nodes, edges };
}

function buildDot(nodes: SystemNode[], edges: Edge[]): string {
  const lines = [
    'digraph SummitSystem {',
    '  rankdir=LR;',
    '  node [shape=box, style=filled, color="#334155", fontname="Inter", fontsize=10];',
  ];

  nodes.forEach((node) => {
    const fill = node.type === 'service' ? '#dbeafe' : node.type === 'workflow' ? '#e2e8f0' : '#dcfce7';
    const shape = node.type === 'workflow' ? 'folder' : 'box';
    lines.push(
      `  "${node.id}" [label="${node.name}\n(${node.type})\n${node.source}", shape=${shape}, fillcolor="${fill}"];`
    );
  });

  edges.forEach((edge) => {
    lines.push(`  "${edge.from}" -> "${edge.to}" [label="${edge.type}"];`);
  });

  lines.push('}');
  return lines.join('\n');
}

async function renderPng(dotPath: string, pngPath: string): Promise<void> {
  const dotExists = await new Promise<boolean>((resolve) => {
    const proc = spawn('which', ['dot']);
    proc.on('close', (code) => resolve(code === 0));
  });

  if (!dotExists) {
    // eslint-disable-next-line no-console
    console.warn('Graphviz (dot) not found on PATH. Skipping PNG render.');
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const proc = spawn('dot', ['-Tpng', dotPath, '-o', pngPath]);
    proc.on('close', (code) => {
      if (code === 0) return resolve();
      return reject(new Error(`dot exited with code ${code}`));
    });
    proc.on('error', (error) => reject(error));
  });
}

async function main(): Promise<void> {
  if (!(await pathExists(OUTPUT_DIR))) {
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
  }

  const compose = await loadCompose();
  const workspaces = await loadWorkspacePackages();
  const workflows = await loadWorkflows(workspaces.nodes, compose.nodes);

  const nodes = ensureUnique([...compose.nodes, ...workspaces.nodes, ...workflows.nodes]);
  const edges = [...compose.edges, ...workspaces.edges, ...workflows.edges];

  const payload = {
    generatedAt: new Date().toISOString(),
    inputs: {
      composeFiles: compose.files,
      workspacePatterns: workspaces.patterns,
      workflowCount: workflows.nodes.length,
    },
    nodes,
    edges,
  };

  const dot = buildDot(nodes, edges);

  await fs.writeFile(JSON_OUTPUT, JSON.stringify(payload, null, 2), 'utf8');
  await fs.writeFile(DOT_OUTPUT, dot, 'utf8');
  await renderPng(DOT_OUTPUT, PNG_OUTPUT);

  // eslint-disable-next-line no-console
  console.log(`System map generated: ${path.relative(ROOT, JSON_OUTPUT)}, ${path.relative(ROOT, DOT_OUTPUT)}, ${path.relative(ROOT, PNG_OUTPUT)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
