import fs from "node:fs";
import path from "node:path";
import {
  buildDependencyGraph,
  buildRiskTable,
  ensureArchitectureDir,
  paths,
  renderMermaidPng,
  toDot,
  toMermaid,
} from "./architecture/dependency-graph.js";

function writeRiskTableMarkdown(tablePath: string, table: ReturnType<typeof buildRiskTable>) {
  const lines = [
    "| Service | Inbound | Outbound | Risk Score | Critical Dependencies |",
    "| --- | ---: | ---: | ---: | --- |",
  ];
  table.forEach((row) => {
    lines.push(
      `| ${row.service} | ${row.inbound} | ${row.outbound} | ${row.riskScore} | ${
        row.criticalDependencies.join(", ") || "—"
      } |`
    );
  });
  fs.writeFileSync(tablePath, `${lines.join("\n")}\n`);
}

async function main() {
  const graph = buildDependencyGraph();
  ensureArchitectureDir();

  const dot = toDot(graph);
  const mermaid = toMermaid(graph);
  const riskTable = buildRiskTable(graph);

  fs.writeFileSync(paths.dependencyGraphJson, `${JSON.stringify(graph, null, 2)}\n`);
  fs.writeFileSync(paths.dependencyGraphDot, `${dot}\n`);
  writeRiskTableMarkdown(paths.dependencyRiskTable, riskTable);

  await renderMermaidPng(mermaid, paths.dependencyGraphPng);

  console.log("Dependency graph generated");
  console.log(`Nodes: ${graph.nodes.length}`);
  console.log(`Edges: ${graph.edges.length}`);
  console.log(`Complexity: ${graph.complexity.toFixed(2)}`);
  console.log(`DOT: ${path.relative(process.cwd(), paths.dependencyGraphDot)}`);
  console.log(`JSON: ${path.relative(process.cwd(), paths.dependencyGraphJson)}`);
  console.log(`PNG: ${path.relative(process.cwd(), paths.dependencyGraphPng)}`);
  console.log(`Risk table: ${path.relative(process.cwd(), paths.dependencyRiskTable)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
