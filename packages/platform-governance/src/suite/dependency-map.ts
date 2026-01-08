import fs from "fs";
import path from "path";

export interface DependencyEdge {
  from: string;
  to: string;
}

export interface DependencyGraph {
  nodes: Set<string>;
  edges: DependencyEdge[];
}

export interface CycleReport {
  hasCycles: boolean;
  cycles: string[][];
}

function readJson(filePath: string): any {
  const content = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(content);
}

export function discoverWorkspacePackages(rootDir: string): Map<string, string> {
  const packagesDir = path.join(rootDir, "packages");
  const entries = fs.readdirSync(packagesDir, { withFileTypes: true });
  const packages = new Map<string, string>();

  entries.forEach((entry) => {
    if (!entry.isDirectory()) return;
    const packageJsonPath = path.join(packagesDir, entry.name, "package.json");
    if (!fs.existsSync(packageJsonPath)) return;
    const pkg = readJson(packageJsonPath);
    if (pkg?.name) {
      packages.set(pkg.name as string, path.join(packagesDir, entry.name));
    }
  });

  return packages;
}

export function buildDependencyGraph(packageRoots: Map<string, string>): DependencyGraph {
  const edges: DependencyEdge[] = [];
  const nodes = new Set<string>(packageRoots.keys());

  packageRoots.forEach((pkgPath, pkgName) => {
    const pkgJsonPath = path.join(pkgPath, "package.json");
    const pkg = readJson(pkgJsonPath);
    const deps = Object.assign({}, pkg.dependencies, pkg.devDependencies, pkg.peerDependencies);
    Object.keys(deps || {}).forEach((dep) => {
      if (packageRoots.has(dep)) {
        edges.push({ from: pkgName, to: dep });
      }
    });
  });

  return { nodes, edges };
}

export function detectCircularDependencies(graph: DependencyGraph): CycleReport {
  const visited = new Set<string>();
  const stack = new Set<string>();
  const cycles: string[][] = [];

  function dfs(node: string, pathSoFar: string[]): void {
    visited.add(node);
    stack.add(node);
    pathSoFar.push(node);

    graph.edges
      .filter((edge) => edge.from === node)
      .forEach((edge) => {
        if (!visited.has(edge.to)) {
          dfs(edge.to, pathSoFar.slice());
        } else if (stack.has(edge.to)) {
          const cycleStart = pathSoFar.indexOf(edge.to);
          const cycle = pathSoFar.slice(cycleStart);
          cycles.push([...cycle, edge.to]);
        }
      });

    stack.delete(node);
  }

  graph.nodes.forEach((node) => {
    if (!visited.has(node)) {
      dfs(node, []);
    }
  });

  return { hasCycles: cycles.length > 0, cycles };
}

export interface DependencyPolicyResult {
  compliant: boolean;
  cycles: string[][];
}

export function enforceAcyclicDependencies(rootDir: string): DependencyPolicyResult {
  const packages = discoverWorkspacePackages(rootDir);
  const graph = buildDependencyGraph(packages);
  const cycleReport = detectCircularDependencies(graph);
  return { compliant: !cycleReport.hasCycles, cycles: cycleReport.cycles };
}
