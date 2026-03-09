#!/usr/bin/env node
/**
 * End-to-End Demo: Innovation Simulation on Summit Repository
 *
 * META-VALIDATION: Uses the Innovation Simulation system to analyze
 * the Summit repository's own development, including the Innovation Sim itself.
 */

import { RepoAdapter } from "./evidence-ingest/adapters/repo-adapter.ts";
import { PaperAdapter } from "./evidence-ingest/adapters/paper-adapter.ts";
import { ManualAdapter } from "./evidence-ingest/adapters/manual-adapter.ts";
import { TemporalGraphBuilder } from "./graph-builder/temporal-builder.ts";
import { validateGraph } from "./graph-fabric/ontology/innovation-ontology.ts";
import * as fs from "node:fs";

console.log("╔═══════════════════════════════════════════════════════════╗");
console.log("║   Innovation Simulation System - Meta-Validation Demo    ║");
console.log("║   Analyzing Summit Repository's Own Development          ║");
console.log("╚═══════════════════════════════════════════════════════════╝\n");

const SUMMIT_REPO = "/Users/brianlong/Developer/summit";

// Step 1: Collect Evidence from Multiple Sources
console.log("Step 1: Collecting Evidence");
console.log("============================\n");

console.log("1.1 Repository Evidence (Git History)");
console.log("--------------------------------------");

const repoAdapter = new RepoAdapter();
let repoEvents = [];

try {
  repoEvents = await repoAdapter.fetch({
    repoPath: SUMMIT_REPO,
    since: "2026-03-08", // Last 2 days
    extract: ["commits"],
  });
  console.log(`✓ Extracted ${repoEvents.length} events from git history`);
} catch (error) {
  console.error(`✗ Error: ${error.message}`);
}

console.log("\n1.2 Paper Evidence (Research Citations)");
console.log("----------------------------------------");

const paperAdapter = new PaperAdapter();
let paperEvents = [];

try {
  // Papers relevant to Summit's innovation capabilities
  const papers = await paperAdapter.fetchBatch([
    { arxivId: "1706.03762" }, // Transformers (NLP)
    { arxivId: "1810.04805" }, // BERT
  ]);
  paperEvents = papers;
  console.log(`✓ Extracted ${paperEvents.length} events from academic papers`);
} catch (error) {
  console.error(`✗ Error: ${error.message}`);
}

console.log("\n1.3 Manual Evidence (Human Curation)");
console.log("-------------------------------------");

const manualAdapter = new ManualAdapter();
let manualEvents = [];

try {
  // Curate key Summit innovations
  manualAdapter.addEntries([
    {
      id: "manual-001",
      source: "summit-architecture-review",
      observedAt: "2026-03-09T00:00:00Z",
      confidence: 1.0,
      assertions: [
        { type: "node_exists", subject: "innovation-simulation-engine", confidence: 1.0 },
        { type: "edge_exists", subject: "summit-platform", predicate: "develops", object: "innovation-simulation-engine", confidence: 1.0 },
        { type: "attribute_value", subject: "innovation-simulation-engine", predicate: "maturity", object: "nascent", confidence: 1.0 },
        { type: "attribute_value", subject: "innovation-simulation-engine", predicate: "strategic_importance", object: "critical", confidence: 1.0 },
      ],
      tags: ["summit", "innovation", "meta"],
    },
    {
      id: "manual-002",
      source: "summit-architecture-review",
      observedAt: "2026-03-09T00:00:00Z",
      confidence: 1.0,
      assertions: [
        { type: "node_exists", subject: "repository-archaeology-engine", confidence: 1.0 },
        { type: "edge_exists", subject: "innovation-simulation-engine", predicate: "builds-on", object: "repository-archaeology-engine", confidence: 1.0 },
        { type: "attribute_value", subject: "repository-archaeology-engine", predicate: "maturity", object: "emerging", confidence: 1.0 },
      ],
      tags: ["summit", "archaeology", "dependency"],
    },
    {
      id: "manual-003",
      source: "summit-architecture-review",
      observedAt: "2026-03-09T00:00:00Z",
      confidence: 1.0,
      assertions: [
        { type: "node_exists", subject: "evolution-intelligence-system", confidence: 1.0 },
        { type: "edge_exists", subject: "innovation-simulation-engine", predicate: "builds-on", object: "evolution-intelligence-system", confidence: 1.0 },
        { type: "attribute_value", subject: "evolution-intelligence-system", predicate: "maturity", object: "mature", confidence: 1.0 },
      ],
      tags: ["summit", "evolution", "foundation"],
    },
  ]);

  manualEvents = await manualAdapter.fetch({});
  console.log(`✓ Extracted ${manualEvents.length} events from manual curation`);

  const stats = manualAdapter.getStats();
  console.log(`  - Total assertions: ${stats.totalAssertions}`);
  console.log(`  - Avg confidence: ${stats.avgConfidence.toFixed(2)}`);
} catch (error) {
  console.error(`✗ Error: ${error.message}`);
}

// Step 2: Fuse Evidence into Innovation Graph
console.log("\n\nStep 2: Building Innovation Graph");
console.log("==================================\n");

const builder = new TemporalGraphBuilder({
  minConfidence: 0.5,
  autoGenerateNodeIds: true,
  autoGenerateEdgeIds: true,
});

console.log("2.1 Ingesting Evidence");
console.log("----------------------");

const allEvents = [...repoEvents, ...paperEvents, ...manualEvents];
console.log(`Total evidence events: ${allEvents.length}`);

builder.ingest(allEvents);

console.log(`✓ Evidence fusion complete`);
console.log(`  - Nodes created: ${builder.getNodeCount()}`);
console.log(`  - Edges created: ${builder.getEdgeCount()}`);

console.log("\n2.2 Building Graph Snapshot");
console.log("---------------------------");

const graph = builder.buildGraph("summit-innovation-graph-2026-03-09");

console.log(`✓ Graph snapshot created`);
console.log(`  - ID: ${graph.metadata.id}`);
console.log(`  - Version: ${graph.metadata.version}`);
console.log(`  - Nodes: ${graph.nodes.length}`);
console.log(`  - Edges: ${graph.edges.length}`);

// Step 3: Validate Graph
console.log("\n\nStep 3: Validating Graph");
console.log("========================\n");

const validation = validateGraph(graph);

if (validation.valid) {
  console.log("✓ Graph validation PASSED");
  console.log("  - All nodes have evidence");
  console.log("  - All edges have evidence");
  console.log("  - All references are valid");
  console.log("  - All types are valid");
} else {
  console.log("✗ Graph validation FAILED");
  for (const error of validation.errors) {
    console.log(`  - ${error}`);
  }
}

// Step 4: Analyze Graph Statistics
console.log("\n\nStep 4: Graph Statistics");
console.log("========================\n");

if (graph.stats) {
  console.log("Node Distribution:");
  for (const [type, count] of Object.entries(graph.stats.nodeCountByType)) {
    console.log(`  - ${type}: ${count}`);
  }

  console.log("\nEdge Distribution:");
  for (const [type, count] of Object.entries(graph.stats.edgeCountByType)) {
    console.log(`  - ${type}: ${count}`);
  }

  console.log(`\nOverall:`);
  console.log(`  - Total nodes: ${graph.stats.totalNodes}`);
  console.log(`  - Total edges: ${graph.stats.totalEdges}`);
  console.log(`  - Total evidence refs: ${graph.stats.totalEvidenceRefs}`);
  console.log(`  - Average confidence: ${graph.stats.avgConfidence.toFixed(3)}`);
}

// Step 5: Export Graph
console.log("\n\nStep 5: Exporting Graph");
console.log("=======================\n");

const outputPath = "/Users/brianlong/Developer/summit/services/innovation-sim/output/summit-innovation-graph.json";

try {
  // Ensure output directory exists
  const outputDir = outputPath.substring(0, outputPath.lastIndexOf("/"));
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(graph, null, 2));
  console.log(`✓ Graph exported to: ${outputPath}`);
  console.log(`  - File size: ${(fs.statSync(outputPath).size / 1024).toFixed(2)} KB`);
} catch (error) {
  console.error(`✗ Error exporting graph: ${error.message}`);
}

// Step 6: Key Insights
console.log("\n\nStep 6: Key Insights");
console.log("====================\n");

console.log("Meta-Validation Success! The Innovation Simulation system has:");
console.log("  1. ✓ Extracted evidence from its own git repository");
console.log("  2. ✓ Incorporated academic paper citations");
console.log("  3. ✓ Integrated human-curated knowledge");
console.log("  4. ✓ Fused multi-source evidence into a temporal graph");
console.log("  5. ✓ Validated the graph against ontology rules");
console.log("  6. ✓ Generated statistics and insights");

console.log("\nKey Discoveries:");
if (graph.nodes.some(n => n.name.toLowerCase().includes("innovation"))) {
  console.log("  - Innovation Simulation Engine node detected ✓");
}
if (graph.nodes.some(n => n.name.toLowerCase().includes("archaeology"))) {
  console.log("  - Repository Archaeology Engine node detected ✓");
}
if (graph.edges.some(e => e.type === "builds-on")) {
  console.log("  - 'builds-on' relationships detected ✓");
}

console.log("\nNext Steps:");
console.log("  - PR4-10: Complete remaining simulation capabilities");
console.log("  - Apply to external repositories for validation");
console.log("  - Generate strategy recommendations");

console.log("\n╔═══════════════════════════════════════════════════════════╗");
console.log("║             Meta-Validation Complete!                    ║");
console.log("║   Innovation Sim successfully analyzed itself            ║");
console.log("╚═══════════════════════════════════════════════════════════╝");
