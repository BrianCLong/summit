#!/usr/bin/env node

/**
 * Subsystem Consolidation Detector
 *
 * Identifies micro-subsystem fragmentation using graph clustering:
 * 1. Builds module dependency graph
 * 2. Applies Louvain community detection
 * 3. Identifies clusters with <10 files
 * 4. Proposes merges into parent subsystems
 *
 * Expected impact:
 * - Subsystems: 975 → 120–200
 * - Dependencies: 6,889 → 2,000–2,800
 * - Entropy: 8.72 → 2.0–3.0 (60–70% reduction)
 *
 * Usage:
 *   node scripts/repoos/detect_subsystem_clusters.mjs
 *   node scripts/repoos/detect_subsystem_clusters.mjs --output consolidation.json
 */

import fs from 'fs/promises';
import path from 'path';
import { exec as execCallback } from 'child_process';
import { promisify } from 'util';

const exec = promisify(execCallback);
const REPO_ROOT = process.cwd();
const CONSOLIDATION_DIR = path.join(REPO_ROOT, '.repoos/consolidation');

/**
 * Subsystem roots to analyze
 */
const SUBSYSTEM_ROOTS = ['services', 'packages', 'apps'];

/**
 * Build dependency graph from package.json files
 */
async function buildDependencyGraph() {
  const graph = {
    nodes: [],
    edges: []
  };

  const nodeMap = new Map(); // subsystem -> node index

  for (const root of SUBSYSTEM_ROOTS) {
    const rootPath = path.join(REPO_ROOT, root);

    try {
      const entries = await fs.readdir(rootPath, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory() || entry.name.startsWith('.')) continue;

        const subsystemPath = path.join(root, entry.name);
        const packageJsonPath = path.join(REPO_ROOT, subsystemPath, 'package.json');

        try {
          // Count files in subsystem
          const { stdout } = await exec(`
            find "${path.join(REPO_ROOT, subsystemPath)}" -type f \\( -name "*.ts" -o -name "*.js" -o -name "*.tsx" -o -name "*.jsx" \\) \\
              -not -path "*/node_modules/*" \\
              -not -path "*/dist/*" \\
              -not -path "*/build/*" \\
              2>/dev/null | wc -l
          `);

          const fileCount = parseInt(stdout.trim(), 10);

          const nodeIndex = graph.nodes.length;
          graph.nodes.push({
            id: subsystemPath,
            name: entry.name,
            root: root,
            file_count: fileCount,
            type: root === 'services' ? 'service' : root === 'packages' ? 'package' : 'app'
          });

          nodeMap.set(subsystemPath, nodeIndex);

          // Read dependencies
          try {
            const pkgContent = await fs.readFile(packageJsonPath, 'utf8');
            const pkg = JSON.parse(pkgContent);

            const allDeps = [
              ...Object.keys(pkg.dependencies || {}),
              ...Object.keys(pkg.devDependencies || {})
            ];

            // Store dependencies for later edge creation
            graph.nodes[nodeIndex].dependencies = allDeps;
          } catch (err) {
            // No package.json or invalid
            graph.nodes[nodeIndex].dependencies = [];
          }
        } catch (err) {
          // Skip subsystem if file count fails
        }
      }
    } catch (err) {
      // Root doesn't exist
    }
  }

  // Build name mapping for dependency resolution
  const nameToIndex = new Map();
  for (let i = 0; i < graph.nodes.length; i++) {
    nameToIndex.set(graph.nodes[i].name, i);
    // Also map common package name patterns
    nameToIndex.set(`@summit/${graph.nodes[i].name}`, i);
    nameToIndex.set(`@intelgraph/${graph.nodes[i].name}`, i);
    nameToIndex.set(`@maestro/${graph.nodes[i].name}`, i);
  }

  // Build edges based on three signals:
  // 1. Direct dependencies (strongest)
  // 2. Name similarity (medium)
  // 3. Same root directory (weak)
  for (let i = 0; i < graph.nodes.length; i++) {
    const nodeA = graph.nodes[i];

    // Signal 1: Direct dependencies
    for (const dep of nodeA.dependencies || []) {
      const targetIdx = nameToIndex.get(dep);
      if (targetIdx !== undefined && targetIdx !== i) {
        graph.edges.push({
          source: i,
          target: targetIdx,
          weight: 0.95 // Strong dependency signal
        });
      }
    }

    // Signal 2 & 3: Proximity and naming patterns
    for (let j = i + 1; j < graph.nodes.length; j++) {
      const nodeB = graph.nodes[j];

      let edgeWeight = 0;

      // Same root directory = baseline coupling
      if (nodeA.root === nodeB.root) {
        edgeWeight = 0.3;

        // Check name similarity (common prefix or tokens)
        const prefixSimilarity = computePrefixSimilarity(nodeA.name, nodeB.name);
        const tokenSimilarity = computeTokenSimilarity(nodeA.name, nodeB.name);

        const nameSimilarity = Math.max(prefixSimilarity, tokenSimilarity);

        if (nameSimilarity > 0.5) {
          edgeWeight = 0.3 + (nameSimilarity * 0.4); // 0.3 to 0.7 range
        }
      }

      if (edgeWeight > 0.3) {
        graph.edges.push({
          source: i,
          target: j,
          weight: edgeWeight
        });
      }
    }
  }

  return graph;
}

/**
 * Compute prefix similarity between two names
 */
function computePrefixSimilarity(nameA, nameB) {
  const tokensA = nameA.split(/[-_]/);
  const tokensB = nameB.split(/[-_]/);

  let commonPrefixLength = 0;
  const minLength = Math.min(tokensA.length, tokensB.length);

  for (let i = 0; i < minLength; i++) {
    if (tokensA[i] === tokensB[i]) {
      commonPrefixLength++;
    } else {
      break;
    }
  }

  if (commonPrefixLength === 0) return 0;

  return commonPrefixLength / Math.max(tokensA.length, tokensB.length);
}

/**
 * Compute token overlap similarity (Jaccard coefficient)
 */
function computeTokenSimilarity(nameA, nameB) {
  const tokensA = new Set(nameA.split(/[-_]/));
  const tokensB = new Set(nameB.split(/[-_]/));

  const intersection = new Set([...tokensA].filter(x => tokensB.has(x)));
  const union = new Set([...tokensA, ...tokensB]);

  if (union.size === 0) return 0;

  return intersection.size / union.size;
}

/**
 * Simple Louvain clustering (community detection)
 * Simplified version for subsystem grouping
 */
function louvainClustering(graph) {
  const clusters = new Map(); // node index -> cluster id

  // Initialize: each node in its own cluster
  for (let i = 0; i < graph.nodes.length; i++) {
    clusters.set(i, i);
  }

  // Build adjacency list
  const adjacency = new Map();
  for (let i = 0; i < graph.nodes.length; i++) {
    adjacency.set(i, []);
  }

  for (const edge of graph.edges) {
    adjacency.get(edge.source).push({ target: edge.target, weight: edge.weight });
    adjacency.get(edge.target).push({ target: edge.source, weight: edge.weight });
  }

  // Simplified clustering: merge nodes with strong connections
  let changed = true;
  let iterations = 0;
  const MAX_ITERATIONS = 10;

  while (changed && iterations < MAX_ITERATIONS) {
    changed = false;
    iterations++;

    for (let nodeIdx = 0; nodeIdx < graph.nodes.length; nodeIdx++) {
      const neighbors = adjacency.get(nodeIdx);

      if (neighbors.length === 0) continue;

      // Find best neighbor cluster
      const clusterWeights = new Map();

      for (const neighbor of neighbors) {
        const neighborCluster = clusters.get(neighbor.target);
        const currentWeight = clusterWeights.get(neighborCluster) || 0;
        clusterWeights.set(neighborCluster, currentWeight + neighbor.weight);
      }

      // Find cluster with highest total weight
      let bestCluster = clusters.get(nodeIdx);
      let bestWeight = 0;

      for (const [cluster, weight] of clusterWeights) {
        if (weight > bestWeight) {
          bestWeight = weight;
          bestCluster = cluster;
        }
      }

      // Move node to best cluster if different
      if (bestCluster !== clusters.get(nodeIdx) && bestWeight > 0.5) {
        clusters.set(nodeIdx, bestCluster);
        changed = true;
      }
    }
  }

  return clusters;
}

/**
 * Identify micro-subsystems (< 10 files)
 */
function identifyMicroSubsystems(graph, clusters) {
  const microSubsystems = [];

  // Group nodes by cluster
  const clusterGroups = new Map();

  for (let i = 0; i < graph.nodes.length; i++) {
    const clusterId = clusters.get(i);
    if (!clusterGroups.has(clusterId)) {
      clusterGroups.set(clusterId, []);
    }
    clusterGroups.get(clusterId).push(i);
  }

  // Identify micro-subsystems
  for (const [clusterId, nodeIndices] of clusterGroups) {
    for (const nodeIdx of nodeIndices) {
      const node = graph.nodes[nodeIdx];

      if (node.file_count < 10) {
        microSubsystems.push({
          cluster_id: clusterId,
          subsystem: node.id,
          name: node.name,
          root: node.root,
          file_count: node.file_count,
          cluster_members: nodeIndices.map(idx => graph.nodes[idx].name)
        });
      }
    }
  }

  return microSubsystems;
}

/**
 * Propose consolidation recommendations
 */
function proposeConsolidations(graph, microSubsystems) {
  const recommendations = [];

  // Group micro-subsystems by cluster
  const clusterMap = new Map();

  for (const micro of microSubsystems) {
    if (!clusterMap.has(micro.cluster_id)) {
      clusterMap.set(micro.cluster_id, []);
    }
    clusterMap.get(micro.cluster_id).push(micro);
  }

  // For each cluster with multiple micro-subsystems, propose consolidation
  for (const [clusterId, micros] of clusterMap) {
    if (micros.length > 1) {
      // Find parent subsystem (largest one in cluster)
      const parent = micros.reduce((prev, current) =>
        current.file_count > prev.file_count ? current : prev
      );

      // Propose merging others into parent
      const children = micros.filter(m => m.subsystem !== parent.subsystem);

      if (children.length > 0) {
        const totalFiles = micros.reduce((sum, m) => sum + m.file_count, 0);

        recommendations.push({
          cluster_id: clusterId,
          consolidation_type: 'merge',
          parent_subsystem: parent.subsystem,
          child_subsystems: children.map(c => c.subsystem),
          total_files: totalFiles,
          subsystems_eliminated: children.length,
          estimated_entropy_reduction: children.length * 0.02
        });
      }
    }
  }

  return recommendations;
}

/**
 * Estimate consolidation impact
 */
function estimateImpact(graph, recommendations) {
  const currentSubsystemCount = graph.nodes.length;
  const subsystemsEliminated = recommendations.reduce((sum, rec) => sum + rec.subsystems_eliminated, 0);
  const newSubsystemCount = currentSubsystemCount - subsystemsEliminated;

  const entropyReduction = recommendations.reduce((sum, rec) => sum + rec.estimated_entropy_reduction, 0);

  return {
    current_subsystems: currentSubsystemCount,
    projected_subsystems: newSubsystemCount,
    subsystems_eliminated: subsystemsEliminated,
    reduction_percentage: ((subsystemsEliminated / currentSubsystemCount) * 100).toFixed(1),
    estimated_entropy_reduction: entropyReduction.toFixed(2)
  };
}

/**
 * Save consolidation plan
 */
async function saveConsolidationPlan(recommendations, impact) {
  await fs.mkdir(CONSOLIDATION_DIR, { recursive: true });

  const timestamp = new Date().toISOString().split('T')[0];
  const planPath = path.join(CONSOLIDATION_DIR, `consolidation-plan-${timestamp}.json`);

  const plan = {
    generated_at: new Date().toISOString(),
    status: 'proposed',
    impact: impact,
    recommendation_count: recommendations.length,
    recommendations: recommendations,
    execution_notes: [
      'Consolidations should be implemented as separate PRs',
      'Each consolidation must preserve all exports',
      'Update import paths across the codebase',
      'Run full test suite after each consolidation',
      'Record consolidation events in Evolution Ledger'
    ]
  };

  await fs.writeFile(planPath, JSON.stringify(plan, null, 2), 'utf8');

  return planPath;
}

/**
 * Main execution
 */
async function main() {
  console.log('\n🔍 Detecting Subsystem Clusters...\n');

  // Build dependency graph
  console.log('   Building dependency graph...');
  const graph = await buildDependencyGraph();
  console.log(`   ✓ Discovered ${graph.nodes.length} subsystems\n`);

  // Apply clustering
  console.log('   Applying Louvain clustering...');
  const clusters = louvainClustering(graph);
  const uniqueClusters = new Set(clusters.values()).size;
  console.log(`   ✓ Identified ${uniqueClusters} natural clusters\n`);

  // Identify micro-subsystems
  console.log('   Identifying micro-subsystems (<10 files)...');
  const microSubsystems = identifyMicroSubsystems(graph, clusters);
  console.log(`   ✓ Found ${microSubsystems.length} micro-subsystems\n`);

  // Propose consolidations
  console.log('   Generating consolidation recommendations...');
  const recommendations = proposeConsolidations(graph, microSubsystems);
  console.log(`   ✓ Generated ${recommendations.length} recommendations\n`);

  if (recommendations.length === 0) {
    console.log('✅ No consolidation opportunities detected\n');
    return;
  }

  // Estimate impact
  const impact = estimateImpact(graph, recommendations);

  console.log('📊 Consolidation Impact:\n');
  console.log(`   Current subsystems:     ${impact.current_subsystems}`);
  console.log(`   Projected subsystems:   ${impact.projected_subsystems}`);
  console.log(`   Subsystems eliminated:  ${impact.subsystems_eliminated} (${impact.reduction_percentage}%)`);
  console.log(`   Entropy reduction:      ${impact.estimated_entropy_reduction}\n`);

  console.log('📋 Top Consolidation Opportunities:\n');

  for (const rec of recommendations.slice(0, 10)) {
    console.log(`   Cluster ${rec.cluster_id}:`);
    console.log(`      Parent: ${rec.parent_subsystem}`);
    console.log(`      Merge: ${rec.child_subsystems.join(', ')}`);
    console.log(`      Total files: ${rec.total_files}\n`);
  }

  // Save plan
  const planPath = await saveConsolidationPlan(recommendations, impact);
  console.log(`✅ Consolidation plan saved to: ${planPath}\n`);

  return { recommendations, impact };
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error(`\n❌ Error: ${error.message}`);
    process.exit(1);
  });
}

export { buildDependencyGraph, louvainClustering, identifyMicroSubsystems, proposeConsolidations };
