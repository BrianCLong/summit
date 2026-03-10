#!/usr/bin/env node
/**
 * Demo: Evidence Adapters on Summit Repository
 *
 * Demonstrates using the evidence ingest adapters on the Summit repository itself.
 */

import { RepoAdapter } from "./evidence-ingest/adapters/repo-adapter.ts";
import { PaperAdapter } from "./evidence-ingest/adapters/paper-adapter.ts";
import { ManualAdapter } from "./evidence-ingest/adapters/manual-adapter.ts";

console.log("Innovation Simulation - Evidence Adapter Demo");
console.log("==============================================\n");

// 1. Demo Repo Adapter on Summit repository
console.log("1. Repository Adapter (Summit repo)");
console.log("-----------------------------------");

const repoAdapter = new RepoAdapter();

try {
  const repoEvents = await repoAdapter.fetch({
    repoPath: "/Users/brianlong/Developer/summit",
    since: "2026-03-08",
    extract: ["commits", "tags"],
  });

  console.log(`✓ Extracted ${repoEvents.length} evidence events from git history`);

  if (repoEvents.length > 0) {
    const latestCommit = repoEvents[0];
    console.log(`\nLatest commit:`);
    console.log(`  ID: ${latestCommit.id}`);
    console.log(`  Source: ${latestCommit.source}`);
    console.log(`  Observed: ${latestCommit.observedAt}`);
    console.log(`  Confidence: ${latestCommit.confidence}`);
    console.log(`  Assertions: ${latestCommit.assertions.length}`);
    if (latestCommit.rawMetadata) {
      console.log(`  Author: ${latestCommit.rawMetadata.author}`);
      console.log(`  Message: ${latestCommit.rawMetadata.subject}`);
    }
  }
} catch (error) {
  console.error(`Error: ${error.message}`);
}

// 2. Demo Paper Adapter
console.log("\n\n2. Paper Adapter (ArXiv)");
console.log("------------------------");

const paperAdapter = new PaperAdapter();

try {
  const paperEvents = await paperAdapter.fetch({
    arxivId: "1706.03762", // Attention Is All You Need
  });

  console.log(`✓ Extracted ${paperEvents.length} evidence events from papers`);

  if (paperEvents.length > 0) {
    const paper = paperEvents[0];
    console.log(`\nPaper:`);
    console.log(`  ID: ${paper.id}`);
    console.log(`  Source: ${paper.source}`);
    console.log(`  URI: ${paper.uri}`);
    console.log(`  Observed: ${paper.observedAt}`);
    console.log(`  Confidence: ${paper.confidence}`);
    console.log(`  Assertions: ${paper.assertions.length}`);
    if (paper.rawMetadata) {
      console.log(`  Title: ${paper.rawMetadata.title}`);
      console.log(`  Authors: ${paper.rawMetadata.authors?.slice(0, 3).join(", ")}`);
      console.log(`  Citations: ${paper.rawMetadata.citationCount}`);
    }
  }
} catch (error) {
  console.error(`Error: ${error.message}`);
}

// 3. Demo Manual Adapter
console.log("\n\n3. Manual Adapter (Human Curation)");
console.log("-----------------------------------");

const manualAdapter = new ManualAdapter();

try {
  // Add manual entries for Summit's own development
  manualAdapter.addEntry({
    id: "manual-summit-innovation-sim",
    source: "summit-development-roadmap",
    observedAt: "2026-03-09T00:00:00Z",
    confidence: 1.0,
    assertions: [
      {
        type: "node_exists",
        subject: "innovation-simulation-engine",
        confidence: 1.0,
      },
      {
        type: "edge_exists",
        subject: "summit-platform",
        predicate: "develops",
        object: "innovation-simulation-engine",
        confidence: 1.0,
      },
      {
        type: "attribute_value",
        subject: "innovation-simulation-engine",
        predicate: "maturity",
        object: "nascent",
        confidence: 1.0,
      },
    ],
    notes: "Innovation Simulation Engine development started March 2026",
    tags: ["summit", "innovation", "simulation"],
  });

  manualAdapter.addEntry({
    id: "manual-summit-repo-archaeology",
    source: "summit-development-roadmap",
    observedAt: "2026-03-09T00:00:00Z",
    confidence: 1.0,
    assertions: [
      {
        type: "node_exists",
        subject: "repository-archaeology-engine",
        confidence: 1.0,
      },
      {
        type: "edge_exists",
        subject: "innovation-simulation-engine",
        predicate: "builds-on",
        object: "repository-archaeology-engine",
        confidence: 1.0,
      },
    ],
    notes: "Innovation Sim builds on Repository Archaeology foundation",
    tags: ["summit", "archaeology", "dependency"],
  });

  const manualEvents = await manualAdapter.fetch({});

  console.log(`✓ Extracted ${manualEvents.length} evidence events from manual curation`);

  const stats = manualAdapter.getStats();
  console.log(`\nStatistics:`);
  console.log(`  Total entries: ${stats.totalEntries}`);
  console.log(`  Total assertions: ${stats.totalAssertions}`);
  console.log(`  Avg confidence: ${stats.avgConfidence.toFixed(2)}`);
  console.log(`  Tags: ${Object.keys(stats.tagCounts).join(", ")}`);

} catch (error) {
  console.error(`Error: ${error.message}`);
}

// 4. Summary
console.log("\n\n=== Summary ===");
console.log("Evidence adapters successfully demonstrated!");
console.log("- Repository adapter: extracts git history (commits, tags, files)");
console.log("- Paper adapter: normalizes academic papers (arxiv, DOI)");
console.log("- Manual adapter: stores human-curated evidence");
console.log("\nNext steps:");
console.log("- PR3: Temporal Innovation Graph Builder (fuse evidence into graphs)");
console.log("- Apply to Summit repository for meta-validation");
