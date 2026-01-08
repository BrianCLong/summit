import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";
import { globSync } from "glob";

export type DependencyEdge = {
  from: string;
  to: string;
  source: "docker-compose" | "env" | "imports" | "ci-workflow" | "llm-pipeline";
  reason: string;
  weight: number;
};

export type DependencyGraph = {
  nodes: string[];
  edges: DependencyEdge[];
  complexity: number;
};

type ServiceContext = {
  name: string;
  path: string;
};

const serviceDirNamesToSkip = new Set(["__pycache__", "__init__.py"]);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function findRepoRoot(startDir: string): string {
  let current = startDir;
  while (!fs.existsSync(path.join(current, "package.json"))) {
    const parent = path.dirname(current);
    if (parent === current) {
      return startDir;
    }
    current = parent;
  }
  return current;
}

const repoRoot = findRepoRoot(path.resolve(__dirname));

const edgeId = (edge: DependencyEdge) => `${edge.from}__${edge.to}__${edge.source}`;

function readJsonFromString(content: string): unknown {
  try {
    return JSON.parse(content);
  } catch (error) {
    return null;
  }
}

export function loadServiceContexts(): ServiceContext[] {
  const servicesPath = path.join(repoRoot, "services");
  if (!fs.existsSync(servicesPath)) {
    return [];
  }

  const entries = fs.readdirSync(servicesPath, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isDirectory() && !serviceDirNamesToSkip.has(entry.name))
    .map((entry) => ({
      name: entry.name,
      path: path.join(servicesPath, entry.name),
    }));
}

function extractComposeEdges(services: ServiceContext[], nodes: Set<string>): DependencyEdge[] {
  const composeFiles = globSync(path.join(repoRoot, "docker-compose*.yml"));
  const edges: DependencyEdge[] = [];

  composeFiles.forEach((composePath) => {
    const content = fs.readFileSync(composePath, "utf8");
    const doc = yaml.load(content) as {
      services?: Record<string, { depends_on?: Record<string, unknown> | string[] }>;
    };

    if (!doc?.services) {
      return;
    }

    Object.entries(doc.services).forEach(([serviceName, config]) => {
      nodes.add(serviceName);
      const dependsOn = Array.isArray(config?.depends_on)
        ? (config?.depends_on as string[])
        : typeof config?.depends_on === "object"
          ? Object.keys(config.depends_on as Record<string, unknown>)
          : [];

      dependsOn.forEach((dependency) => {
        if (serviceName !== dependency) {
          edges.push({
            from: serviceName,
            to: dependency,
            source: "docker-compose",
            reason: path.basename(composePath),
            weight: 1,
          });
        }
      });
    });
  });

  services.forEach(({ name }) => nodes.add(name));

  return edges;
}

function findServiceMentions(content: string, serviceNames: string[]): string[] {
  const mentions = new Set<string>();
  serviceNames.forEach((service) => {
    const pattern = new RegExp(`\\b${service.replace(/[-/]/g, "[\\-/]")}\\b`, "i");
    if (pattern.test(content)) {
      mentions.add(service);
    }
  });
  return [...mentions];
}

function extractEnvEdges(services: ServiceContext[], nodes: Set<string>): DependencyEdge[] {
  const edges: DependencyEdge[] = [];
  const serviceNames = services.map((service) => service.name);

  services.forEach((service) => {
    const envFiles = globSync(path.join(service.path, ".env*"));
    envFiles.forEach((envPath) => {
      const content = fs.readFileSync(envPath, "utf8");
      const mentions = findServiceMentions(content, serviceNames);
      mentions
        .filter((mention) => mention !== service.name)
        .forEach((mention) => {
          edges.push({
            from: service.name,
            to: mention,
            source: "env",
            reason: path.relative(repoRoot, envPath),
            weight: 0.5,
          });
        });
    });
  });

  services.forEach(({ name }) => nodes.add(name));

  return edges;
}

function extractImportEdges(services: ServiceContext[], nodes: Set<string>): DependencyEdge[] {
  const edges: DependencyEdge[] = [];
  const serviceNames = services.map((service) => service.name);
  const fileExtensions = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".py"];

  services.forEach((service) => {
    const files = globSync(path.join(service.path, "**", "*.{ts,tsx,js,jsx,mjs,cjs,py}"), {
      ignore: [
        "**/node_modules/**",
        "**/dist/**",
        "**/build/**",
        "**/.turbo/**",
        "**/.next/**",
        "**/__pycache__/**",
      ],
    });

    files.forEach((filePath) => {
      const ext = path.extname(filePath);
      if (!fileExtensions.includes(ext)) {
        return;
      }

      const content = fs.readFileSync(filePath, "utf8");

      const importRegex = /from\s+['"]([^'"]+)['"]|require\(([^)]+)\)/g;
      let match: RegExpExecArray | null;

      const matchedServices = new Set<string>();

      while ((match = importRegex.exec(content)) !== null) {
        const target = match[1] ?? match[2];
        if (!target) {
          continue;
        }
        serviceNames.forEach((name) => {
          if (name === service.name) {
            return;
          }
          if (target.includes(`services/${name}`) || target.includes(`${name}/`)) {
            matchedServices.add(name);
          }
        });
      }

      const rawMentions = findServiceMentions(content, serviceNames);
      rawMentions
        .filter((mention) => mention !== service.name)
        .forEach((mention) => matchedServices.add(mention));

      matchedServices.forEach((mention) => {
        edges.push({
          from: service.name,
          to: mention,
          source: "imports",
          reason: path.relative(repoRoot, filePath),
          weight: 1,
        });
      });
    });
  });

  services.forEach(({ name }) => nodes.add(name));

  return edges;
}

function extractWorkflowEdges(nodes: Set<string>, services: ServiceContext[]): DependencyEdge[] {
  const workflowFiles = globSync(path.join(repoRoot, ".github", "workflows", "*.yml"));
  const serviceNames = services.map((service) => service.name);
  const edges: DependencyEdge[] = [];

  workflowFiles.forEach((workflowPath) => {
    const content = fs.readFileSync(workflowPath, "utf8");
    const mentions = findServiceMentions(content, serviceNames);
    if (mentions.length < 2) {
      return;
    }

    mentions.forEach((from) => {
      mentions.forEach((to) => {
        if (from !== to) {
          edges.push({
            from,
            to,
            source: "ci-workflow",
            reason: path.relative(repoRoot, workflowPath),
            weight: 0.75,
          });
        }
      });
    });
  });

  services.forEach(({ name }) => nodes.add(name));

  return edges;
}

function extractPipelineEdges(nodes: Set<string>, services: ServiceContext[]): DependencyEdge[] {
  const serviceNames = services.map((service) => service.name);
  const pipelines = globSync(path.join(repoRoot, "**", "*pipeline*.{yml,yaml,json}"), {
    ignore: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/.turbo/**",
      "**/.next/**",
      "**/venv/**",
    ],
  });
  const edges: DependencyEdge[] = [];

  pipelines.forEach((pipelinePath) => {
    const content = fs.readFileSync(pipelinePath, "utf8");
    const mentions = findServiceMentions(content, serviceNames);

    let structured: unknown = null;
    try {
      structured = pipelinePath.endsWith(".json")
        ? readJsonFromString(content)
        : yaml.load(content);
    } catch (error) {
      const docs = yaml.loadAll(content);
      structured = docs[0] ?? null;
      console.warn(`YAML parse issue in ${pipelinePath}: ${(error as Error).message}`);
    }
    const stageMentions = new Set<string>(mentions);

    if (structured && typeof structured === "object") {
      const structuredString = JSON.stringify(structured);
      findServiceMentions(structuredString, serviceNames).forEach((mention) =>
        stageMentions.add(mention)
      );
    }

    const mentionedServices = [...stageMentions];
    if (mentionedServices.length < 2) {
      return;
    }

    mentionedServices.forEach((from) => {
      mentionedServices.forEach((to) => {
        if (from !== to) {
          edges.push({
            from,
            to,
            source: "llm-pipeline",
            reason: path.relative(repoRoot, pipelinePath),
            weight: 0.9,
          });
        }
      });
    });
  });

  services.forEach(({ name }) => nodes.add(name));

  return edges;
}

export function buildDependencyGraph(): DependencyGraph {
  const nodes = new Set<string>();
  const services = loadServiceContexts();

  const sources = [
    extractComposeEdges(services, nodes),
    extractEnvEdges(services, nodes),
    extractImportEdges(services, nodes),
    extractWorkflowEdges(nodes, services),
    extractPipelineEdges(nodes, services),
  ];

  const deduped = new Map<string, DependencyEdge>();
  sources.flat().forEach((edge) => {
    const id = edgeId(edge);
    if (!deduped.has(id)) {
      deduped.set(id, edge);
    }
  });

  const edges = [...deduped.values()];
  const complexity = edges.reduce((total, edge) => total + edge.weight, 0);

  return { nodes: [...nodes].sort(), edges, complexity };
}

export function toDot(graph: DependencyGraph): string {
  const lines = ["digraph dependencies {", "  rankdir=LR;"];
  graph.edges.forEach((edge) => {
    const label = `${edge.source}: ${edge.reason}`.replace(/"/g, '\\"');
    lines.push(
      `  "${edge.from}" -> "${edge.to}" [label="${label}", weight=${edge.weight.toFixed(2)}];`
    );
  });
  lines.push("}");
  return lines.join("\n");
}

export function toMermaid(graph: DependencyGraph): string {
  const lines = ["graph TD"];
  graph.edges.forEach((edge) => {
    const label = `${edge.source}`;
    lines.push(
      `  ${edge.from.replace(/[-\s]/g, "_")} -->|${label}| ${edge.to.replace(/[-\s]/g, "_")}`
    );
  });
  return lines.join("\n");
}

export function buildRiskTable(graph: DependencyGraph): Array<{
  service: string;
  inbound: number;
  outbound: number;
  riskScore: number;
  criticalDependencies: string[];
}> {
  const inboundCount = new Map<string, number>();
  const outboundCount = new Map<string, number>();
  const criticalDeps = new Map<string, Set<string>>();

  graph.nodes.forEach((node) => {
    inboundCount.set(node, 0);
    outboundCount.set(node, 0);
    criticalDeps.set(node, new Set());
  });

  graph.edges.forEach((edge) => {
    outboundCount.set(edge.from, (outboundCount.get(edge.from) ?? 0) + 1);
    inboundCount.set(edge.to, (inboundCount.get(edge.to) ?? 0) + 1);
    if (edge.weight >= 1) {
      criticalDeps.get(edge.from)?.add(edge.to);
    }
  });

  const table = graph.nodes.map((service) => {
    const inbound = inboundCount.get(service) ?? 0;
    const outbound = outboundCount.get(service) ?? 0;
    const riskScore = inbound * 2 + outbound + (criticalDeps.get(service)?.size ?? 0);
    const dependencies = [...(criticalDeps.get(service) ?? [])].sort();
    return { service, inbound, outbound, riskScore, criticalDependencies: dependencies };
  });

  return table.sort((a, b) => b.riskScore - a.riskScore || b.inbound - a.inbound);
}

export function summarizeBlastRadius(
  graph: DependencyGraph,
  failedService: string
): {
  degraded: Array<{ service: string; distance: number }>;
  cascadeRisk: number;
} {
  const adjacency = new Map<string, Set<string>>();
  graph.edges.forEach((edge) => {
    const dependents = adjacency.get(edge.to) ?? new Set<string>();
    dependents.add(edge.from);
    adjacency.set(edge.to, dependents);
  });

  const visited = new Set<string>();
  const queue: Array<{ service: string; distance: number }> = [];

  queue.push({ service: failedService, distance: 0 });
  visited.add(failedService);

  const degraded: Array<{ service: string; distance: number }> = [];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      break;
    }

    const dependents = adjacency.get(current.service);
    dependents?.forEach((dependent) => {
      if (!visited.has(dependent)) {
        visited.add(dependent);
        const distance = current.distance + 1;
        degraded.push({ service: dependent, distance });
        queue.push({ service: dependent, distance });
      }
    });
  }

  const cascadeRisk = degraded.reduce((score, item) => score + Math.max(1, 3 - item.distance), 0);

  return {
    degraded: degraded.sort(
      (a, b) => a.distance - b.distance || a.service.localeCompare(b.service)
    ),
    cascadeRisk,
  };
}

export function ensureArchitectureDir(): string {
  const outputDir = path.join(repoRoot, "docs", "architecture");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  return outputDir;
}

export async function renderMermaidPng(diagram: string, outputPath: string): Promise<void> {
  const encoded = Buffer.from(diagram).toString("base64");
  const url = `https://mermaid.ink/img/${encoded}`;
  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `Failed to render diagram via mermaid.ink: ${response.status} ${response.statusText}`
      );
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    await fs.promises.writeFile(outputPath, buffer);
  } catch (error) {
    const placeholder = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/w8AAgMBgobqt/8AAAAASUVORK5CYII=",
      "base64"
    );
    await fs.promises.writeFile(outputPath, placeholder);
    console.warn(
      `Mermaid render failed (${(error as Error).message}). Wrote placeholder PNG to ${outputPath}.`
    );
  }
}

export function calculateComplexityDelta(
  current: DependencyGraph,
  baseline?: DependencyGraph
): {
  current: number;
  baseline: number;
  delta: number;
} {
  const baselineValue = baseline?.complexity ?? 0;
  return {
    current: current.complexity,
    baseline: baselineValue,
    delta: current.complexity - baselineValue,
  };
}

export function loadGraphFromFile(jsonPath: string): DependencyGraph | null {
  if (!fs.existsSync(jsonPath)) {
    return null;
  }
  const content = fs.readFileSync(jsonPath, "utf8");
  const parsed = JSON.parse(content) as DependencyGraph;
  return parsed;
}

export const paths = {
  repoRoot,
  outputDir: path.join(repoRoot, "docs", "architecture"),
  dependencyGraphJson: path.join(repoRoot, "docs", "architecture", "dependency-graph.json"),
  dependencyGraphDot: path.join(repoRoot, "docs", "architecture", "dependency-graph.dot"),
  dependencyGraphPng: path.join(repoRoot, "docs", "architecture", "dependency-graph.png"),
  blastRadiusPng: path.join(repoRoot, "docs", "architecture", "blast-radius.png"),
  dependencyRiskTable: path.join(repoRoot, "docs", "architecture", "dependency-risk-table.md"),
};
