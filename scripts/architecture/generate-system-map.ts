#!/usr/bin/env npx ts-node

/**
 * Living System Map Generator
 *
 * Generates a visual system map from:
 * - Docker Compose files (services)
 * - pnpm workspace packages
 * - Package dependencies
 * - CI workflow definitions
 *
 * Output formats:
 * - system-map.json (structured data)
 * - system-map.dot (Graphviz DOT format)
 *
 * Usage:
 *   npx ts-node scripts/architecture/generate-system-map.ts
 *   pnpm system-map:generate
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

// ESM compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const ROOT_DIR = path.resolve(__dirname, "../..");
const OUTPUT_DIR = path.join(ROOT_DIR, "docs/architecture");
const COMPOSE_FILES = ["docker-compose.dev.yml", "docker-compose.ai.yml"];
const WORKSPACE_FILE = "pnpm-workspace.yaml";

// Types
interface Service {
  name: string;
  type: "docker" | "package" | "app" | "workflow";
  category: string;
  description?: string;
  port?: number;
  dependencies: string[];
  dependents: string[];
  metadata: Record<string, unknown>;
}

interface SystemMap {
  version: string;
  generatedAt: string;
  services: Record<string, Service>;
  edges: Array<{
    from: string;
    to: string;
    type: "depends_on" | "imports" | "triggers" | "network";
  }>;
  categories: Record<string, string[]>;
  stats: {
    totalServices: number;
    totalEdges: number;
    byCategory: Record<string, number>;
  };
}

/**
 * Parse YAML-like content (simple parser for compose/workspace files)
 */
function parseSimpleYaml(content: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const lines = content.split("\n");
  const stack: Array<{ indent: number; obj: Record<string, unknown>; key?: string }> = [
    { indent: -1, obj: result },
  ];

  for (const line of lines) {
    // Skip comments and empty lines
    if (line.trim().startsWith("#") || line.trim() === "") continue;

    const match = line.match(/^(\s*)([^:\s]+):\s*(.*)$/);
    if (!match) continue;

    const indent = match[1].length;
    const key = match[2];
    let value = match[3].trim();

    // Pop stack until we find parent
    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
      stack.pop();
    }

    const parent = stack[stack.length - 1].obj;

    if (value === "" || value.startsWith("'") || value.startsWith('"')) {
      // Nested object or string value
      if (value) {
        value = value.replace(/^['"]|['"]$/g, "");
        parent[key] = value;
      } else {
        parent[key] = {};
        stack.push({ indent, obj: parent[key] as Record<string, unknown>, key });
      }
    } else if (value.startsWith("[")) {
      // Array value
      try {
        parent[key] = JSON.parse(value.replace(/'/g, '"'));
      } catch {
        parent[key] = value;
      }
    } else if (value.startsWith("-")) {
      // List item
      if (!Array.isArray(parent[key])) {
        parent[key] = [];
      }
      (parent[key] as string[]).push(value.substring(1).trim());
    } else {
      parent[key] = value;
    }
  }

  return result;
}

/**
 * Parse Docker Compose file and extract services
 */
function parseDockerCompose(filepath: string): Service[] {
  const services: Service[] = [];

  if (!fs.existsSync(filepath)) {
    console.log(`Skipping: ${filepath} (not found)`);
    return services;
  }

  const content = fs.readFileSync(filepath, "utf-8");
  const lines = content.split("\n");

  let currentService: string | null = null;
  let inServices = false;

  const serviceData: Record<
    string,
    {
      ports: string[];
      depends_on: string[];
      image?: string;
      build?: string;
    }
  > = {};

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Track services section
    if (trimmed === "services:") {
      inServices = true;
      continue;
    }

    if (inServices) {
      // Check for volume/network sections (end of services)
      if (/^(volumes|networks):/.test(trimmed) && !line.startsWith(" ")) {
        inServices = false;
        continue;
      }

      // Check for service definition (exactly 2 spaces, then a word ending with colon)
      // Match lines like "  postgres:" or "  api:"
      if (/^  [a-zA-Z][\w-]*:\s*$/.test(line)) {
        currentService = trimmed.replace(":", "");
        serviceData[currentService] = { ports: [], depends_on: [] };
        continue;
      }

      if (currentService && line.startsWith("    ")) {
        // Parse service properties
        if (trimmed.startsWith("image:")) {
          serviceData[currentService].image = trimmed.replace(/^image:\s*/, "");
        } else if (trimmed.startsWith("build:")) {
          serviceData[currentService].build = trimmed.replace(/^build:\s*/, "");
        } else if (trimmed.startsWith("- '") && trimmed.includes(":")) {
          // Port mapping like - '5432:5432'
          const portMatch = trimmed.match(/- '(\d+):\d+'/);
          if (portMatch) {
            serviceData[currentService].ports.push(portMatch[1]);
          }
        } else if (trimmed === "depends_on:") {
          // Read the next lines for dependencies
          let j = i + 1;
          while (j < lines.length) {
            const depLine = lines[j];
            const depTrimmed = depLine.trim();
            // Check if still in depends_on section (more indented than depends_on:)
            if (!depLine.startsWith("      ")) break;

            // Match dependency names like "postgres:" or "- postgres"
            const depMatch = depTrimmed.match(/^(\w[\w-]*):/);
            if (depMatch) {
              serviceData[currentService].depends_on.push(depMatch[1]);
            }
            j++;
          }
        }
      }
    }
  }

  // Convert to Service objects
  for (const [name, data] of Object.entries(serviceData)) {
    const category = categorizeService(name, data.image || data.build || "");
    services.push({
      name,
      type: "docker",
      category,
      port: data.ports.length > 0 ? parseInt(data.ports[0], 10) : undefined,
      dependencies: data.depends_on,
      dependents: [],
      metadata: {
        image: data.image,
        build: data.build,
        source: path.basename(filepath),
      },
    });
  }

  return services;
}

/**
 * Categorize a service based on name and image
 */
function categorizeService(name: string, imageOrBuild: string): string {
  const lower = name.toLowerCase();
  const img = imageOrBuild.toLowerCase();

  if (lower.includes("postgres") || img.includes("postgres")) return "database";
  if (lower.includes("neo4j") || img.includes("neo4j")) return "database";
  if (lower.includes("redis") || img.includes("redis")) return "cache";
  if (lower.includes("elasticsearch") || img.includes("elasticsearch")) return "search";
  if (lower.includes("kafka") || img.includes("kafka")) return "messaging";
  if (lower.includes("prometheus") || lower.includes("grafana") || lower.includes("jaeger"))
    return "observability";
  if (lower.includes("loki") || lower.includes("alertmanager")) return "observability";
  if (lower.includes("ai") || lower.includes("copilot") || lower.includes("ml")) return "ai";
  if (lower.includes("api") || lower.includes("gateway")) return "api";
  if (lower.includes("web") || lower.includes("client")) return "frontend";
  if (lower.includes("websocket")) return "realtime";

  return "service";
}

/**
 * Parse pnpm workspace and find packages
 */
function parseWorkspacePackages(): Service[] {
  const services: Service[] = [];
  const workspaceFile = path.join(ROOT_DIR, WORKSPACE_FILE);

  if (!fs.existsSync(workspaceFile)) {
    console.log("No pnpm-workspace.yaml found");
    return services;
  }

  const content = fs.readFileSync(workspaceFile, "utf-8");

  // Extract package patterns
  const patterns: string[] = [];
  const lines = content.split("\n");
  let inPackages = false;

  for (const line of lines) {
    if (line.trim() === "packages:") {
      inPackages = true;
      continue;
    }
    if (inPackages && line.trim().startsWith("-")) {
      const pattern = line.trim().replace(/^-\s*['"]?|['"]?$/g, "");
      if (!pattern.startsWith("#")) {
        patterns.push(pattern);
      }
    }
    if (inPackages && !line.trim().startsWith("-") && line.trim() !== "") {
      inPackages = false;
    }
  }

  // Expand patterns and find packages
  for (const pattern of patterns) {
    const basePath = pattern.replace("/*", "").replace("/**", "");
    const fullPath = path.join(ROOT_DIR, basePath);

    if (!fs.existsSync(fullPath)) continue;

    const entries = fs.readdirSync(fullPath, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const pkgJsonPath = path.join(fullPath, entry.name, "package.json");
      if (!fs.existsSync(pkgJsonPath)) continue;

      try {
        const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, "utf-8"));
        const deps = [
          ...Object.keys(pkgJson.dependencies || {}),
          ...Object.keys(pkgJson.devDependencies || {}),
        ].filter((d) => d.startsWith("@intelgraph") || d.startsWith("@summit"));

        const category = categorizePackage(basePath, entry.name, pkgJson);

        services.push({
          name: pkgJson.name || `${basePath}/${entry.name}`,
          type: basePath === "apps" ? "app" : "package",
          category,
          description: pkgJson.description,
          dependencies: deps,
          dependents: [],
          metadata: {
            path: `${basePath}/${entry.name}`,
            version: pkgJson.version,
          },
        });
      } catch {
        // Skip invalid package.json
      }
    }
  }

  return services;
}

/**
 * Categorize a package
 */
function categorizePackage(
  basePath: string,
  name: string,
  pkgJson: Record<string, unknown>
): string {
  const lower = name.toLowerCase();

  if (basePath === "apps") {
    if (lower.includes("web") || lower.includes("client")) return "frontend";
    if (lower.includes("api") || lower.includes("server")) return "api";
    if (lower.includes("gateway")) return "api";
    return "app";
  }

  if (basePath === "services") {
    if (lower.includes("graph") || lower.includes("neo4j")) return "graph";
    if (lower.includes("ai") || lower.includes("copilot") || lower.includes("ml")) return "ai";
    if (lower.includes("auth") || lower.includes("policy")) return "security";
    return "service";
  }

  if (basePath === "packages") {
    if (lower.includes("ui") || lower.includes("component")) return "ui";
    if (lower.includes("types") || lower.includes("schema")) return "types";
    if (lower.includes("db") || lower.includes("data")) return "data";
    return "library";
  }

  return "other";
}

/**
 * Parse CI workflows
 */
function parseWorkflows(): Service[] {
  const services: Service[] = [];
  const workflowDir = path.join(ROOT_DIR, ".github/workflows");

  if (!fs.existsSync(workflowDir)) {
    console.log("No .github/workflows directory found");
    return services;
  }

  const files = fs
    .readdirSync(workflowDir)
    .filter((f) => f.endsWith(".yml") || f.endsWith(".yaml"));

  for (const file of files) {
    const filepath = path.join(workflowDir, file);
    const content = fs.readFileSync(filepath, "utf-8");

    // Extract workflow name
    const nameMatch = content.match(/^name:\s*['"]?(.+?)['"]?\s*$/m);
    const name = nameMatch ? nameMatch[1] : file.replace(/\.(yml|yaml)$/, "");

    // Extract triggers
    const triggers: string[] = [];
    const onMatch = content.match(/^on:\s*$/m);
    if (onMatch) {
      const triggerMatches = content.match(
        /^\s{2}(push|pull_request|schedule|workflow_dispatch):/gm
      );
      if (triggerMatches) {
        triggers.push(...triggerMatches.map((t) => t.trim().replace(":", "")));
      }
    }

    services.push({
      name: `workflow:${file.replace(/\.(yml|yaml)$/, "")}`,
      type: "workflow",
      category: "ci",
      description: name,
      dependencies: [],
      dependents: [],
      metadata: {
        file,
        triggers,
      },
    });
  }

  return services;
}

/**
 * Generate DOT format for Graphviz
 */
function generateDotFormat(map: SystemMap): string {
  const lines: string[] = [
    "digraph SystemMap {",
    "  rankdir=TB;",
    "  node [shape=box, style=filled];",
    "  graph [compound=true, splines=ortho];",
    "",
  ];

  // Define color scheme for categories
  const colors: Record<string, string> = {
    database: "#4A90D9",
    cache: "#7B68EE",
    search: "#48D1CC",
    messaging: "#FF6B6B",
    observability: "#FFA500",
    ai: "#9370DB",
    api: "#32CD32",
    frontend: "#FF69B4",
    realtime: "#20B2AA",
    service: "#778899",
    graph: "#4A90D9",
    security: "#DC143C",
    library: "#A9A9A9",
    types: "#D3D3D3",
    data: "#87CEEB",
    ui: "#FFB6C1",
    ci: "#F0E68C",
    app: "#98FB98",
    other: "#DCDCDC",
  };

  // Group services by category using subgraphs
  const byCategory: Record<string, Service[]> = {};
  for (const service of Object.values(map.services)) {
    if (!byCategory[service.category]) {
      byCategory[service.category] = [];
    }
    byCategory[service.category].push(service);
  }

  // Create subgraphs for categories
  for (const [category, services] of Object.entries(byCategory)) {
    const color = colors[category] || colors.other;
    lines.push(`  subgraph cluster_${category} {`);
    lines.push(`    label="${category.toUpperCase()}";`);
    lines.push(`    style=filled;`);
    lines.push(`    fillcolor="${color}20";`);
    lines.push(`    color="${color}";`);
    lines.push("");

    for (const service of services) {
      const nodeId = service.name.replace(/[^a-zA-Z0-9]/g, "_");
      const label = service.name.replace(/^(workflow:|@intelgraph\/|@summit\/)/, "");
      const tooltip = service.description || service.name;
      lines.push(`    ${nodeId} [label="${label}", fillcolor="${color}", tooltip="${tooltip}"];`);
    }

    lines.push("  }");
    lines.push("");
  }

  // Add edges
  lines.push("  // Dependencies");
  for (const edge of map.edges) {
    const fromId = edge.from.replace(/[^a-zA-Z0-9]/g, "_");
    const toId = edge.to.replace(/[^a-zA-Z0-9]/g, "_");
    const style =
      edge.type === "depends_on" ? "solid" : edge.type === "imports" ? "dashed" : "dotted";
    lines.push(`  ${fromId} -> ${toId} [style=${style}];`);
  }

  lines.push("}");
  return lines.join("\n");
}

/**
 * Main function
 */
async function main(): Promise<void> {
  console.log("Generating Living System Map...\n");

  const allServices: Service[] = [];
  const edges: SystemMap["edges"] = [];

  // Parse Docker Compose files
  console.log("Parsing Docker Compose files...");
  for (const composeFile of COMPOSE_FILES) {
    const filepath = path.join(ROOT_DIR, composeFile);
    const services = parseDockerCompose(filepath);
    console.log(`  Found ${services.length} services in ${composeFile}`);
    allServices.push(...services);
  }

  // Parse workspace packages (limit to avoid overwhelming the graph)
  console.log("\nParsing workspace packages...");
  const packages = parseWorkspacePackages();
  console.log(`  Found ${packages.length} packages`);

  // Only include key packages to keep graph manageable
  const keyPackages = packages.filter((p) => {
    const path = (p.metadata.path as string) || "";
    return (
      path.startsWith("apps/") ||
      path.startsWith("services/") ||
      (path.startsWith("packages/") && (p.dependencies.length > 0 || p.name.includes("core")))
    );
  });
  console.log(`  Included ${keyPackages.length} key packages`);
  allServices.push(...keyPackages.slice(0, 50)); // Limit to avoid huge graphs

  // Parse CI workflows
  console.log("\nParsing CI workflows...");
  const workflows = parseWorkflows();
  console.log(`  Found ${workflows.length} workflows`);
  allServices.push(...workflows);

  // Build service map
  const servicesMap: Record<string, Service> = {};
  for (const service of allServices) {
    servicesMap[service.name] = service;
  }

  // Build edges from dependencies
  for (const service of allServices) {
    for (const dep of service.dependencies) {
      if (servicesMap[dep]) {
        edges.push({
          from: service.name,
          to: dep,
          type: service.type === "docker" ? "depends_on" : "imports",
        });
        servicesMap[dep].dependents.push(service.name);
      }
    }
  }

  // Build category map
  const categories: Record<string, string[]> = {};
  for (const service of allServices) {
    if (!categories[service.category]) {
      categories[service.category] = [];
    }
    categories[service.category].push(service.name);
  }

  // Build stats
  const byCategory: Record<string, number> = {};
  for (const [cat, services] of Object.entries(categories)) {
    byCategory[cat] = services.length;
  }

  // Create SystemMap
  const systemMap: SystemMap = {
    version: "1.0.0",
    generatedAt: new Date().toISOString(),
    services: servicesMap,
    edges,
    categories,
    stats: {
      totalServices: allServices.length,
      totalEdges: edges.length,
      byCategory,
    },
  };

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Write JSON output
  const jsonPath = path.join(OUTPUT_DIR, "system-map.json");
  fs.writeFileSync(jsonPath, JSON.stringify(systemMap, null, 2));
  console.log(`\nWritten: ${jsonPath}`);

  // Write DOT output
  const dotContent = generateDotFormat(systemMap);
  const dotPath = path.join(OUTPUT_DIR, "system-map.dot");
  fs.writeFileSync(dotPath, dotContent);
  console.log(`Written: ${dotPath}`);

  // Print summary
  console.log(`
System Map Summary:
  Total Services: ${systemMap.stats.totalServices}
  Total Edges: ${systemMap.stats.totalEdges}

Categories:
${Object.entries(systemMap.stats.byCategory)
  .sort((a, b) => b[1] - a[1])
  .map(([cat, count]) => `  ${cat}: ${count}`)
  .join("\n")}

To render the graph:
  dot -Tpng docs/architecture/system-map.dot -o docs/architecture/system-map.png
  dot -Tsvg docs/architecture/system-map.dot -o docs/architecture/system-map.svg
`);
}

main().catch((err) => {
  console.error("Error generating system map:", err);
  process.exit(1);
});
