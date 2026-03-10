#!/usr/bin/env node
/**
 * Complete Summit Repository Analysis
 *
 * Extracts all available data from Summit and runs the full
 * Innovation Simulation System pipeline.
 */

import * as fs from "node:fs";
import { execSync } from "node:child_process";

console.log("╔═══════════════════════════════════════════════════════════╗");
console.log("║   Innovation Simulation System: Summit Analysis          ║");
console.log("║   Complete Repository Analysis                           ║");
console.log("╚═══════════════════════════════════════════════════════════╝\n");

const SUMMIT_REPO = "/Users/brianlong/Developer/summit";

// ============================================================================
// PHASE 1: Extract Complete Summit Data
// ============================================================================

console.log("PHASE 1: Data Extraction");
console.log("========================\n");

// 1.1: Extract all commits (last 1000 for performance)
console.log("1.1 Extracting commit history...");

let commits = [];

try {
  const cmd = `cd "${SUMMIT_REPO}" && git log --pretty=format:"%H|%an|%ae|%at|%s" --no-merges | head -1000`;
  const output = execSync(cmd, { encoding: "utf-8" });

  commits = output.split("\n").filter(l => l.length > 0).map(line => {
    const [hash, author, email, timestamp, subject] = line.split("|");
    return {
      hash,
      author,
      email,
      timestamp: parseInt(timestamp),
      subject,
      date: new Date(parseInt(timestamp) * 1000).toISOString()
    };
  });

  console.log(`   ✓ Extracted ${commits.length} commits`);
  console.log(`   - Date range: ${commits[commits.length - 1]?.date.substring(0, 10)} to ${commits[0]?.date.substring(0, 10)}`);
  console.log(`   - Authors: ${new Set(commits.map(c => c.author)).size}`);
} catch (error) {
  console.error(`   ✗ Error: ${error.message}`);
}

// 1.2: Extract PR data via GitHub CLI
console.log("\n1.2 Extracting Pull Request data...");

let prs = [];

try {
  const cmd = `cd "${SUMMIT_REPO}" && gh pr list --state all --limit 100 --json number,title,state,createdAt,mergedAt,author,labels 2>/dev/null || echo "[]"`;
  const output = execSync(cmd, { encoding: "utf-8" });

  if (output && output !== "[]") {
    prs = JSON.parse(output);
    console.log(`   ✓ Extracted ${prs.length} pull requests`);
  } else {
    console.log(`   ⚠ No PRs extracted (gh CLI may not be available or authenticated)`);
  }
} catch (error) {
  console.log(`   ⚠ Could not extract PRs: ${error.message}`);
}

// 1.3: Analyze repository structure
console.log("\n1.3 Analyzing repository structure...");

let repoStructure = {
  services: [],
  packages: [],
  apps: [],
  total_files: 0
};

try {
  // Count services
  const servicesCmd = `cd "${SUMMIT_REPO}" && find services -maxdepth 1 -type d 2>/dev/null | wc -l`;
  repoStructure.services = parseInt(execSync(servicesCmd, { encoding: "utf-8" }).trim()) - 1;

  // Count packages
  const packagesCmd = `cd "${SUMMIT_REPO}" && find packages -maxdepth 1 -type d 2>/dev/null | wc -l`;
  repoStructure.packages = parseInt(execSync(packagesCmd, { encoding: "utf-8" }).trim()) - 1;

  // Count apps
  const appsCmd = `cd "${SUMMIT_REPO}" && find apps -maxdepth 1 -type d 2>/dev/null | wc -l`;
  repoStructure.apps = parseInt(execSync(appsCmd, { encoding: "utf-8" }).trim()) - 1;

  console.log(`   ✓ Repository structure analyzed`);
  console.log(`   - Services: ${repoStructure.services}`);
  console.log(`   - Packages: ${repoStructure.packages}`);
  console.log(`   - Apps: ${repoStructure.apps}`);
} catch (error) {
  console.log(`   ⚠ Could not analyze structure: ${error.message}`);
}

// 1.4: Extract key technologies from package.json files
console.log("\n1.4 Extracting technology stack...");

let technologies = new Map();

try {
  const packageFiles = execSync(`cd "${SUMMIT_REPO}" && find . -name "package.json" -not -path "*/node_modules/*" | head -50`,
    { encoding: "utf-8" }
  ).split("\n").filter(f => f.length > 0);

  for (const file of packageFiles.slice(0, 20)) { // Sample first 20 for performance
    try {
      const content = fs.readFileSync(`${SUMMIT_REPO}/${file}`, "utf-8");
      const pkg = JSON.parse(content);

      // Extract dependencies
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };

      for (const [name, version] of Object.entries(deps || {})) {
        if (!technologies.has(name)) {
          technologies.set(name, { name, version, occurrences: 1 });
        } else {
          technologies.get(name).occurrences++;
        }
      }
    } catch (e) {
      // Skip invalid package.json
    }
  }

  console.log(`   ✓ Extracted ${technologies.size} unique technologies`);

  // Show top 10 most used
  const topTech = Array.from(technologies.values())
    .sort((a, b) => b.occurrences - a.occurrences)
    .slice(0, 10);

  console.log(`   - Top technologies: ${topTech.map(t => t.name).join(", ").substring(0, 80)}...`);
} catch (error) {
  console.log(`   ⚠ Could not extract technologies: ${error.message}`);
}

// ============================================================================
// PHASE 2: Build Comprehensive Innovation Graph
// ============================================================================

console.log("\n\nPHASE 2: Innovation Graph Construction");
console.log("=======================================\n");

console.log("2.1 Building nodes from all data sources...");

const nodes = [];
const edges = [];

// Add commit nodes (sample for performance - top 200 most recent)
for (const commit of commits.slice(0, 200)) {
  nodes.push({
    id: `commit-${commit.hash.substring(0, 7)}`,
    type: "project",
    name: commit.subject.substring(0, 60),
    attrs: {
      author: commit.author,
      timestamp: commit.timestamp,
      date: commit.date
    },
    evidenceRefs: [{
      id: `evidence-${commit.hash.substring(0, 7)}`,
      type: "repo",
      source: `summit@${commit.hash.substring(0, 7)}`,
      observedAt: commit.date,
      confidence: 1.0
    }]
  });
}

// Add PR nodes
for (const pr of prs.slice(0, 50)) {
  nodes.push({
    id: `pr-${pr.number}`,
    type: "project",
    name: `PR #${pr.number}: ${pr.title.substring(0, 50)}`,
    attrs: {
      state: pr.state,
      createdAt: pr.createdAt,
      mergedAt: pr.mergedAt,
      author: pr.author?.login || "unknown"
    },
    evidenceRefs: [{
      id: `evidence-pr-${pr.number}`,
      type: "repo",
      source: `github-pr-${pr.number}`,
      observedAt: pr.createdAt,
      confidence: 1.0
    }]
  });
}

// Add top technology nodes
const topTechnologies = Array.from(technologies.values())
  .sort((a, b) => b.occurrences - a.occurrences)
  .slice(0, 30);

for (const tech of topTechnologies) {
  nodes.push({
    id: `tech-${tech.name.replace(/[^a-z0-9-]/gi, "-")}`,
    type: "technology",
    name: tech.name,
    attrs: {
      version: tech.version,
      occurrences: tech.occurrences,
      category: inferTechCategory(tech.name)
    },
    evidenceRefs: [{
      id: `evidence-tech-${tech.name}`,
      type: "manual",
      source: "package-json-analysis",
      observedAt: new Date().toISOString(),
      confidence: 0.9
    }]
  });
}

// Add Summit core components (manually curated)
const summitComponents = [
  { id: "summit-platform", type: "organization", name: "Summit Platform", maturity: "mature" },
  { id: "innovation-simulation-engine", type: "technology", name: "Innovation Simulation Engine", maturity: "growth" },
  { id: "repository-archaeology-engine", type: "technology", name: "Repository Archaeology Engine", maturity: "mature" },
  { id: "evolution-intelligence-system", type: "technology", name: "Evolution Intelligence System", maturity: "mature" },
  { id: "evidence-protocol", type: "framework", name: "Summit Evidence Protocol", maturity: "emerging" },
  { id: "intelgraph-platform", type: "product", name: "IntelGraph Platform", maturity: "growth" },
  { id: "autonomous-ops", type: "capability", name: "Autonomous Operations", maturity: "emerging" },
  { id: "agent-control-plane", type: "framework", name: "Agent Control Plane", maturity: "growth" },
];

for (const comp of summitComponents) {
  nodes.push({
    id: comp.id,
    type: comp.type,
    name: comp.name,
    attrs: { maturity: comp.maturity, strategic_importance: "high" },
    evidenceRefs: [{
      id: `evidence-${comp.id}`,
      type: "manual",
      source: "summit-architecture",
      observedAt: new Date().toISOString(),
      confidence: 1.0
    }]
  });
}

console.log(`   ✓ Nodes constructed: ${nodes.length}`);
console.log(`   - Commits: ${commits.slice(0, 200).length}`);
console.log(`   - PRs: ${Math.min(prs.length, 50)}`);
console.log(`   - Technologies: ${topTechnologies.length}`);
console.log(`   - Core components: ${summitComponents.length}`);

// 2.2: Infer edges from data
console.log("\n2.2 Inferring relationships...");

// Summit develops core systems
edges.push(
  { id: "edge-1", type: "develops", from: "summit-platform", to: "innovation-simulation-engine",
    evidenceRefs: [{ id: "ev-1", type: "manual", source: "architecture", observedAt: new Date().toISOString(), confidence: 1.0 }] },
  { id: "edge-2", type: "develops", from: "summit-platform", to: "intelgraph-platform",
    evidenceRefs: [{ id: "ev-2", type: "manual", source: "architecture", observedAt: new Date().toISOString(), confidence: 1.0 }] },
  { id: "edge-3", type: "develops", from: "summit-platform", to: "agent-control-plane",
    evidenceRefs: [{ id: "ev-3", type: "manual", source: "architecture", observedAt: new Date().toISOString(), confidence: 1.0 }] }
);

// Innovation Sim builds on other systems
edges.push(
  { id: "edge-4", type: "builds-on", from: "innovation-simulation-engine", to: "repository-archaeology-engine",
    evidenceRefs: [{ id: "ev-4", type: "manual", source: "architecture", observedAt: new Date().toISOString(), confidence: 1.0 }] },
  { id: "edge-5", type: "builds-on", from: "innovation-simulation-engine", to: "evolution-intelligence-system",
    evidenceRefs: [{ id: "ev-5", type: "manual", source: "architecture", observedAt: new Date().toISOString(), confidence: 1.0 }] },
  { id: "edge-6", type: "uses", from: "innovation-simulation-engine", to: "evidence-protocol",
    evidenceRefs: [{ id: "ev-6", type: "manual", source: "architecture", observedAt: new Date().toISOString(), confidence: 1.0 }] }
);

// IntelGraph uses agent control plane
edges.push(
  { id: "edge-7", type: "uses", from: "intelgraph-platform", to: "agent-control-plane",
    evidenceRefs: [{ id: "ev-7", type: "manual", source: "architecture", observedAt: new Date().toISOString(), confidence: 1.0 }] }
);

// Technology dependencies (infer from common patterns)
const reactNode = nodes.find(n => n.name === "react");
const typescriptNode = nodes.find(n => n.name === "typescript");
const nodeNode = nodes.find(n => n.name === "node" || n.name === "@types/node");

if (reactNode && typescriptNode) {
  edges.push({
    id: "edge-react-typescript",
    type: "uses",
    from: reactNode.id,
    to: typescriptNode.id,
    evidenceRefs: [{ id: "ev-react-ts", type: "manual", source: "dependency-analysis", observedAt: new Date().toISOString(), confidence: 0.9 }]
  });
}

console.log(`   ✓ Edges constructed: ${edges.length}`);

const graph = {
  metadata: {
    id: "summit-complete-analysis",
    version: new Date().toISOString(),
    description: `Complete Summit innovation graph: ${commits.length} commits, ${prs.length} PRs, ${technologies.size} technologies`,
    createdAt: new Date().toISOString(),
    scope: {
      commits: commits.length,
      prs: prs.length,
      technologies: technologies.size,
      services: repoStructure.services,
      packages: repoStructure.packages,
      apps: repoStructure.apps
    }
  },
  nodes,
  edges,
  stats: {
    nodeCountByType: {},
    edgeCountByType: {},
    totalNodes: nodes.length,
    totalEdges: edges.length,
    totalEvidenceRefs: nodes.reduce((sum, n) => sum + n.evidenceRefs.length, 0) + edges.reduce((sum, e) => sum + e.evidenceRefs.length, 0)
  }
};

// Calculate stats
for (const node of nodes) {
  graph.stats.nodeCountByType[node.type] = (graph.stats.nodeCountByType[node.type] || 0) + 1;
}
for (const edge of edges) {
  graph.stats.edgeCountByType[edge.type] = (graph.stats.edgeCountByType[edge.type] || 0) + 1;
}

console.log("\n   📊 Graph Statistics:");
console.log(`   - Total nodes: ${graph.stats.totalNodes}`);
console.log(`   - Total edges: ${graph.stats.totalEdges}`);
console.log(`   - Evidence refs: ${graph.stats.totalEvidenceRefs}`);
console.log(`   - Node types: ${Object.keys(graph.stats.nodeCountByType).join(", ")}`);

// ============================================================================
// PHASE 3: Run Complete Analysis Pipeline
// ============================================================================

console.log("\n\nPHASE 3: Analysis Pipeline");
console.log("===========================\n");

// Build helper maps
const inEdges = new Map();
const outEdges = new Map();

for (const node of nodes) {
  inEdges.set(node.id, []);
  outEdges.set(node.id, []);
}

for (const edge of edges) {
  inEdges.get(edge.to)?.push(edge.from);
  outEdges.get(edge.from)?.push(edge.to);
}

// 3.1: Adoption Analysis
console.log("3.1 Running Adoption Curve Analysis...");

const adoptionEstimates = new Map();
const techAndCoreNodes = nodes.filter(n =>
  n.type === "technology" ||
  n.type === "framework" ||
  n.type === "product" ||
  n.type === "capability" ||
  n.type === "organization"
);

for (const node of techAndCoreNodes) {
  const currentAdoption = node.attrs.occurrences
    ? Math.min(1.0, node.attrs.occurrences / 20)
    : Math.min(1.0, node.evidenceRefs.length / 10);

  const phase = node.attrs.maturity || classifyMaturityPhase(currentAdoption);

  adoptionEstimates.set(node.id, {
    nodeId: node.id,
    nodeName: node.name,
    phase,
    adoptionRate: currentAdoption,
    momentum: calculateSimpleMomentum(phase),
    velocity: 0.03,
    acceleration: 0.0,
    signalCount: node.evidenceRefs.length,
    confidence: 0.8
  });
}

console.log(`   ✓ ${adoptionEstimates.size} adoption estimates generated`);

// 3.2: Diffusion Analysis
console.log("\n3.2 Running Diffusion + Lock-in Analysis...");

const diffusionEstimates = new Map();

for (const node of techAndCoreNodes) {
  const inDegree = inEdges.get(node.id)?.length || 0;
  const outDegree = outEdges.get(node.id)?.length || 0;

  const networkEffect = Math.min(1.0, inDegree / 20);
  const switchingCost = Math.min(1.0, outDegree / 15);
  const complementAssets = Math.min(1.0, inDegree / 10);
  const standardization = Math.min(1.0, node.evidenceRefs.length / 5);

  const lockInStrength = (
    0.35 * networkEffect +
    0.30 * switchingCost +
    0.20 * complementAssets +
    0.15 * standardization
  );

  const adoption = adoptionEstimates.get(node.id);

  diffusionEstimates.set(node.id, {
    nodeId: node.id,
    nodeName: node.name,
    currentAdoption: adoption?.adoptionRate || 0,
    predictedAdoption: {
      t30: Math.min(1.0, (adoption?.adoptionRate || 0) * 1.2),
      t90: Math.min(1.0, (adoption?.adoptionRate || 0) * 1.5),
      t180: Math.min(1.0, (adoption?.adoptionRate || 0) * 1.8),
      t365: Math.min(1.0, (adoption?.adoptionRate || 0) * 2.2)
    },
    diffusionRate: 0.03,
    networkMetrics: {
      degree: inDegree + outDegree,
      inDegree,
      outDegree,
      pageRank: inDegree / Math.max(1, edges.length),
      closeness: 0.5,
      betweenness: 0.3
    },
    lockInEffect: {
      strength: lockInStrength,
      components: { networkEffect, switchingCost, complementAssets, standardization },
      directDependents: inEdges.get(node.id) || [],
      confidence: 0.7
    },
    vulnerabilities: {
      competitors: [],
      switchingFeasibility: 1 - lockInStrength,
      replacementRisk: (1 - lockInStrength) * 0.3
    },
    confidence: 0.75
  });
}

console.log(`   ✓ ${diffusionEstimates.size} diffusion estimates generated`);

// 3.3: Strategy Synthesis
console.log("\n3.3 Generating Strategy Recommendations...");

const recommendations = [];

for (const node of techAndCoreNodes) {
  const adoption = adoptionEstimates.get(node.id);
  const diffusion = diffusionEstimates.get(node.id);

  if (!adoption || !diffusion) continue;

  let type = "monitor";
  let rationale = "Continue monitoring";
  let priority = "medium";

  if (adoption.phase === "nascent" && adoption.momentum > 0.5) {
    type = "monitor";
    rationale = `${node.name} is nascent with high momentum - early adoption opportunity but high risk`;
    priority = "medium";
  } else if (adoption.phase === "emerging" && diffusion.lockInEffect.strength < 0.3) {
    type = "invest";
    rationale = `${node.name} is emerging with low lock-in - good time to invest before standards solidify`;
    priority = "high";
  } else if (adoption.phase === "growth" && diffusion.lockInEffect.strength > 0.2) {
    type = "adopt";
    rationale = `${node.name} in growth phase with moderate lock-in - strong adoption window`;
    priority = "high";
  } else if (adoption.phase === "mature" && diffusion.lockInEffect.strength > 0.5) {
    type = "double-down";
    rationale = `${node.name} is mature with high lock-in - entrenched position, maximize value`;
    priority = "medium";
  } else if (adoption.phase === "declining") {
    type = "migrate";
    rationale = `${node.name} is declining - begin migration planning`;
    priority = "high";
  } else if (diffusion.vulnerabilities.replacementRisk > 0.4) {
    type = "divest";
    rationale = `${node.name} has elevated replacement risk - consider alternatives`;
    priority = "medium";
  }

  const benefit = calculateBenefit(type, adoption, diffusion);
  const cost = calculateCost(type, diffusion);

  recommendations.push({
    id: `rec-${node.id}`,
    type,
    targetNode: node.id,
    nodeName: node.name,
    nodeType: node.type,
    rationale,
    priority,
    evidence: {
      adoptionPhase: adoption.phase,
      adoptionRate: adoption.adoptionRate,
      lockInStrength: diffusion.lockInEffect.strength,
      momentum: adoption.momentum,
      pageRank: diffusion.networkMetrics.pageRank
    },
    confidence: Math.min(adoption.confidence, diffusion.confidence),
    expectedOutcome: {
      benefit,
      cost,
      timeHorizon: getTimeHorizon(adoption.phase),
      roi: cost > 0 ? benefit / cost : benefit
    }
  });
}

// Sort by priority and confidence
recommendations.sort((a, b) => {
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
  if (priorityDiff !== 0) return priorityDiff;
  return b.confidence - a.confidence;
});

console.log(`   ✓ ${recommendations.length} strategy recommendations generated`);
console.log(`   - High priority: ${recommendations.filter(r => r.priority === "high").length}`);
console.log(`   - By type: ${getRecTypeCounts(recommendations)}`);

// ============================================================================
// PHASE 4: Generate Outputs
// ============================================================================

console.log("\n\nPHASE 4: Output Generation");
console.log("===========================\n");

// 4.1: Complete analysis JSON
console.log("4.1 Generating complete analysis report...");

const completeAnalysis = {
  metadata: graph.metadata,
  graph: {
    nodes: graph.nodes.length,
    edges: graph.edges.length,
    stats: graph.stats
  },
  analysis: {
    adoption: Array.from(adoptionEstimates.values()),
    diffusion: Array.from(diffusionEstimates.values()),
    recommendations: recommendations
  },
  summary: {
    dataScope: {
      commits: commits.length,
      prs: prs.length,
      technologies: technologies.size,
      nodes: nodes.length,
      edges: edges.length
    },
    analysis: {
      adoptionEstimates: adoptionEstimates.size,
      diffusionEstimates: diffusionEstimates.size,
      recommendations: recommendations.length,
      highPriorityRecs: recommendations.filter(r => r.priority === "high").length
    },
    topRecommendations: recommendations.slice(0, 10).map(r => ({
      type: r.type,
      target: r.nodeName,
      priority: r.priority,
      confidence: r.confidence
    }))
  },
  keyInsights: generateKeyInsights(adoptionEstimates, diffusionEstimates, recommendations, graph),
  generatedAt: new Date().toISOString()
};

const outputPath = "/Users/brianlong/Developer/summit/services/innovation-sim/output/summit-complete-analysis.json";
fs.writeFileSync(outputPath, JSON.stringify(completeAnalysis, null, 2));

console.log(`   ✓ Complete analysis exported: ${(fs.statSync(outputPath).size / 1024).toFixed(2)} KB`);

// 4.2: Executive Summary
console.log("\n4.2 Generating executive summary...");

const executiveSummary = generateExecutiveSummary(completeAnalysis);
const summaryPath = "/Users/brianlong/Developer/summit/services/innovation-sim/output/summit-executive-summary.txt";
fs.writeFileSync(summaryPath, executiveSummary);

console.log(`   ✓ Executive summary exported: ${summaryPath}`);

// 4.3: Display results
console.log("\n\n╔═══════════════════════════════════════════════════════════╗");
console.log("║          SUMMIT INNOVATION ANALYSIS COMPLETE             ║");
console.log("╚═══════════════════════════════════════════════════════════╝\n");

console.log("📊 Analysis Scope:");
console.log(`   - Commits analyzed:        ${commits.length}`);
console.log(`   - Pull requests:           ${prs.length}`);
console.log(`   - Technologies detected:   ${technologies.size}`);
console.log(`   - Graph nodes:             ${nodes.length}`);
console.log(`   - Graph edges:             ${edges.length}`);

console.log("\n📈 Analysis Results:");
console.log(`   - Adoption estimates:      ${adoptionEstimates.size}`);
console.log(`   - Diffusion estimates:     ${diffusionEstimates.size}`);
console.log(`   - Strategy recommendations: ${recommendations.length}`);
console.log(`   - High priority actions:   ${recommendations.filter(r => r.priority === "high").length}`);

console.log("\n🎯 Top 5 Strategic Recommendations:\n");
for (const rec of recommendations.slice(0, 5)) {
  console.log(`   ${rec.priority === "high" ? "🔴" : rec.priority === "medium" ? "🟡" : "⚪"} ${rec.type.toUpperCase()}: ${rec.nodeName}`);
  console.log(`      ${rec.rationale}`);
  console.log(`      Confidence: ${(rec.confidence * 100).toFixed(0)}% | ROI: ${rec.expectedOutcome.roi.toFixed(2)}x\n`);
}

console.log("💡 Key Insights:\n");
for (const insight of completeAnalysis.keyInsights) {
  console.log(`   • ${insight}`);
}

console.log("\n📁 Output Files:");
console.log(`   - ${outputPath}`);
console.log(`   - ${summaryPath}`);

console.log("\n✅ Summit analysis complete!\n");

// ============================================================================
// Helper Functions
// ============================================================================

function inferTechCategory(name) {
  if (name.includes("react") || name.includes("vue") || name.includes("angular")) return "frontend";
  if (name.includes("express") || name.includes("fastify") || name.includes("node")) return "backend";
  if (name.includes("postgres") || name.includes("mongo") || name.includes("redis")) return "database";
  if (name.includes("test") || name.includes("jest") || name.includes("mocha")) return "testing";
  if (name.includes("typescript") || name.includes("eslint") || name.includes("prettier")) return "tooling";
  return "library";
}

function classifyMaturityPhase(adoptionRate) {
  if (adoptionRate < 0.05) return "nascent";
  if (adoptionRate < 0.15) return "emerging";
  if (adoptionRate < 0.50) return "growth";
  if (adoptionRate < 0.85) return "mature";
  return "declining";
}

function calculateSimpleMomentum(phase) {
  const momentumByPhase = {
    nascent: 0.3,
    emerging: 0.7,
    growth: 0.9,
    mature: 0.3,
    declining: -0.5
  };
  return momentumByPhase[phase] || 0.5;
}

function calculateBenefit(type, adoption, diffusion) {
  const baseBenefit = {
    adopt: 0.8,
    invest: 0.7,
    "double-down": 0.9,
    monitor: 0.3,
    migrate: 0.6,
    divest: 0.4
  };

  return (baseBenefit[type] || 0.5) * (1 + adoption.momentum * 0.3);
}

function calculateCost(type, diffusion) {
  const baseCost = {
    adopt: 0.5,
    invest: 0.7,
    "double-down": 0.8,
    monitor: 0.1,
    migrate: 0.9,
    divest: 0.6
  };

  return (baseCost[type] || 0.5) * (1 + diffusion.lockInEffect.strength * 0.5);
}

function getTimeHorizon(phase) {
  const horizons = {
    nascent: 365,
    emerging: 180,
    growth: 90,
    mature: 30,
    declining: 60
  };
  return horizons[phase] || 180;
}

function getRecTypeCounts(recs) {
  const counts = {};
  for (const rec of recs) {
    counts[rec.type] = (counts[rec.type] || 0) + 1;
  }
  return Object.entries(counts).map(([k, v]) => `${k}=${v}`).join(", ");
}

function generateKeyInsights(adoption, diffusion, recs, graph) {
  const insights = [];

  insights.push(`Summit has ${graph.stats.totalNodes} nodes in innovation graph spanning ${Object.keys(graph.stats.nodeCountByType).length} categories`);

  const highMomentum = Array.from(adoption.values()).filter(a => a.momentum > 0.7).length;
  if (highMomentum > 0) {
    insights.push(`${highMomentum} technologies show high momentum (>0.7), indicating rapid adoption potential`);
  }

  const highLockIn = Array.from(diffusion.values()).filter(d => d.lockInEffect.strength > 0.5).length;
  if (highLockIn > 0) {
    insights.push(`${highLockIn} systems have strong lock-in effects (>0.5), creating competitive moats`);
  }

  const adoptActions = recs.filter(r => r.type === "adopt" && r.priority === "high").length;
  if (adoptActions > 0) {
    insights.push(`${adoptActions} high-priority adoption opportunities identified`);
  }

  const investActions = recs.filter(r => r.type === "invest" && r.priority === "high").length;
  if (investActions > 0) {
    insights.push(`${investActions} emerging technologies warrant investment`);
  }

  insights.push(`Average system confidence: ${(Array.from(diffusion.values()).reduce((sum, d) => sum + d.confidence, 0) / diffusion.size * 100).toFixed(0)}%`);

  return insights;
}

function generateExecutiveSummary(analysis) {
  const lines = [];

  lines.push("=" .repeat(70));
  lines.push("SUMMIT PLATFORM - TECHNOLOGY INNOVATION ANALYSIS");
  lines.push("Executive Summary");
  lines.push("=" + "=".repeat(69));
  lines.push("");
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Analysis Version: 1.0.0`);
  lines.push("");

  lines.push("SCOPE");
  lines.push("-".repeat(70));
  lines.push(`Commits analyzed:        ${analysis.metadata.scope.commits}`);
  lines.push(`Pull requests:           ${analysis.metadata.scope.prs}`);
  lines.push(`Technologies:            ${analysis.metadata.scope.technologies}`);
  lines.push(`Innovation graph nodes:  ${analysis.graph.nodes}`);
  lines.push(`Relationships mapped:    ${analysis.graph.edges}`);
  lines.push("");

  lines.push("ANALYSIS RESULTS");
  lines.push("-".repeat(70));
  lines.push(`Adoption estimates:      ${analysis.analysis.adoption.length}`);
  lines.push(`Diffusion analyses:      ${analysis.analysis.diffusion.length}`);
  lines.push(`Strategy recommendations: ${analysis.analysis.recommendations.length}`);
  lines.push(`High priority actions:   ${analysis.summary.analysis.highPriorityRecs}`);
  lines.push("");

  lines.push("TOP 10 STRATEGIC RECOMMENDATIONS");
  lines.push("-".repeat(70));

  for (const rec of analysis.summary.topRecommendations) {
    const priority = rec.priority === "high" ? "[HIGH]" : rec.priority === "medium" ? "[MED] " : "[LOW] ";
    lines.push(`${priority} ${rec.type.toUpperCase().padEnd(12)} ${rec.target}`);
    lines.push(`       Confidence: ${(rec.confidence * 100).toFixed(0)}%`);
    lines.push("");
  }

  lines.push("KEY INSIGHTS");
  lines.push("-".repeat(70));
  for (const insight of analysis.keyInsights) {
    lines.push(`• ${insight}`);
  }
  lines.push("");

  lines.push("=" + "=".repeat(69));
  lines.push("End of Executive Summary");
  lines.push("=" + "=".repeat(69));

  return lines.join("\n");
}
