import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import {
  buildDependencyGraph,
  calculateComplexityDelta,
  ensureArchitectureDir,
  loadGraphFromFile,
  paths,
} from "../architecture/dependency-graph.js";

const threshold = Number(process.env.DEPENDENCY_COMPLEXITY_THRESHOLD ?? "5");

function loadBaselineGraph(): ReturnType<typeof loadGraphFromFile> {
  const relativePath = path.relative(paths.repoRoot, paths.dependencyGraphJson);
  try {
    const content = execSync(`git show origin/main:${relativePath}`, {
      cwd: paths.repoRoot,
      stdio: ["ignore", "pipe", "ignore"],
    }).toString();
    return JSON.parse(content);
  } catch (error) {
    return loadGraphFromFile(paths.dependencyGraphJson);
  }
}

function ensureCurrentGraph(): void {
  if (fs.existsSync(paths.dependencyGraphJson)) {
    return;
  }
  ensureArchitectureDir();
  const graph = buildDependencyGraph();
  fs.writeFileSync(paths.dependencyGraphJson, `${JSON.stringify(graph, null, 2)}\n`);
}

function main() {
  ensureCurrentGraph();
  const currentGraph = loadGraphFromFile(paths.dependencyGraphJson) ?? buildDependencyGraph();
  const baselineGraph = loadBaselineGraph() ?? undefined;
  const delta = calculateComplexityDelta(currentGraph, baselineGraph);

  const summary = `Current: ${delta.current.toFixed(2)}, Baseline: ${delta.baseline.toFixed(2)}, Delta: ${delta.delta.toFixed(2)}`;
  console.log(summary);

  if (delta.delta > threshold) {
    console.error(
      `Dependency complexity increased by ${delta.delta.toFixed(2)} (> ${threshold}). Architecture review required.`
    );
    process.exit(1);
  }

  console.log("Dependency complexity within threshold.");
}

main();
