import fs from "node:fs";
import path from "node:path";
import {
  buildDependencyGraph,
  ensureArchitectureDir,
  paths,
  renderMermaidPng,
  summarizeBlastRadius,
} from "./architecture/dependency-graph.js";

function renderBlastRadiusMermaid(
  failedService: string,
  degraded: Array<{ service: string; distance: number }>
): string {
  const lines = ["graph TD"];
  lines.push(`  ${failedService.replace(/[-\s]/g, "_")}([${failedService} failure])`);
  degraded.forEach((entry) => {
    const nodeId = entry.service.replace(/[-\s]/g, "_");
    lines.push(
      `  ${failedService.replace(/[-\s]/g, "_")} -->|+${entry.distance} hop(s)| ${nodeId}`
    );
  });
  return lines.join("\n");
}

async function main() {
  const service = process.argv[2];
  if (!service) {
    console.error("Usage: node --loader ts-node/esm scripts/blast-radius.ts <service-name>");
    process.exit(1);
  }

  const graph = buildDependencyGraph();
  if (!graph.nodes.includes(service)) {
    console.error(`Service ${service} not found in dependency graph.`);
    process.exit(1);
  }

  const summary = summarizeBlastRadius(graph, service);
  ensureArchitectureDir();

  const mermaid = renderBlastRadiusMermaid(service, summary.degraded);
  await renderMermaidPng(mermaid, paths.blastRadiusPng);

  const degradedPreview = summary.degraded.slice(0, 20);
  const previewLine = degradedPreview
    .map((entry) => `${entry.service} (hops=${entry.distance})`)
    .join(", ");

  const report = [
    `Blast radius for ${service}`,
    `Degraded services (${summary.degraded.length}): ${previewLine || "none"}`,
    summary.degraded.length > degradedPreview.length
      ? `…and ${summary.degraded.length - degradedPreview.length} more`
      : "",
    `Cascade risk score: ${summary.cascadeRisk.toFixed(2)}`,
    `Visualization: ${path.relative(process.cwd(), paths.blastRadiusPng)}`,
  ].filter(Boolean);

  fs.writeFileSync(path.join(paths.outputDir, "blast-radius-report.txt"), `${report.join("\n")}\n`);

  console.log(report.join("\n"));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
