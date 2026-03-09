#!/usr/bin/env node
/**
 * Quick verification script for PR1 acceptance criteria
 *
 * Verifies:
 * - Fixture loads correctly
 * - All nodes have evidence
 * - All edges have evidence
 * - Confidence scores are valid (0.0-1.0)
 * - Edge references point to existing nodes
 * - Node/edge types are valid
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Valid node types
const VALID_NODE_TYPES = [
  "technology", "capability", "paradigm", "pattern", "framework", "language",
  "organization", "research-group", "community",
  "product", "project", "paper", "standard",
  "market", "domain", "use-case",
  "funding-event", "launch-event", "adoption-signal"
];

// Valid edge types
const VALID_EDGE_TYPES = [
  "builds-on", "replaces", "competes-with", "complements", "depends-on", "enables",
  "implements", "requires", "provides",
  "shifts-to", "challenges", "embodies",
  "develops", "acquires", "invests-in", "partners-with", "publishes", "employs",
  "adopts", "uses", "applies-to",
  "targets", "serves", "creates",
  "funds", "launches", "signals",
  "cites", "influences", "standardizes"
];

// Valid evidence types
const VALID_EVIDENCE_TYPES = [
  "repo", "paper", "funding", "job-posting", "standard", "market-signal", "manual"
];

function loadFixture() {
  const fixturePath = path.join(__dirname, 'testing', 'fixtures', 'minimal-innovation-graph.json');
  console.log(`Loading fixture: ${fixturePath}`);

  if (!fs.existsSync(fixturePath)) {
    throw new Error(`Fixture not found: ${fixturePath}`);
  }

  const data = fs.readFileSync(fixturePath, 'utf-8');
  return JSON.parse(data);
}

function validateEvidence(evidence, context) {
  if (!evidence.id || evidence.id.length === 0) {
    throw new Error(`${context}: Evidence missing ID`);
  }

  if (!VALID_EVIDENCE_TYPES.includes(evidence.type)) {
    throw new Error(`${context}: Invalid evidence type: ${evidence.type}`);
  }

  if (!evidence.source || evidence.source.length === 0) {
    throw new Error(`${context}: Evidence missing source`);
  }

  if (!evidence.observedAt || evidence.observedAt.length === 0) {
    throw new Error(`${context}: Evidence missing observedAt`);
  }

  if (typeof evidence.confidence !== 'number') {
    throw new Error(`${context}: Evidence confidence must be a number`);
  }

  if (evidence.confidence < 0.0 || evidence.confidence > 1.0) {
    throw new Error(`${context}: Evidence confidence must be 0.0-1.0, got ${evidence.confidence}`);
  }
}

function validateNode(node) {
  const context = `Node ${node.id}`;

  // Check required fields
  if (!node.id || node.id.length === 0) {
    throw new Error(`${context}: Missing ID`);
  }

  if (!node.name || node.name.length === 0) {
    throw new Error(`${context}: Missing name`);
  }

  if (!VALID_NODE_TYPES.includes(node.type)) {
    throw new Error(`${context}: Invalid node type: ${node.type}`);
  }

  if (!node.attrs || typeof node.attrs !== 'object') {
    throw new Error(`${context}: Missing or invalid attrs`);
  }

  // Check evidence
  if (!node.evidenceRefs || !Array.isArray(node.evidenceRefs)) {
    throw new Error(`${context}: Missing evidenceRefs array`);
  }

  if (node.evidenceRefs.length === 0) {
    throw new Error(`${context}: Must have at least one evidence reference`);
  }

  // Validate each evidence reference
  for (const evidence of node.evidenceRefs) {
    validateEvidence(evidence, context);
  }

  console.log(`✓ ${context} (type: ${node.type}, evidence count: ${node.evidenceRefs.length})`);
}

function validateEdge(edge, nodeIds) {
  const context = `Edge ${edge.id}`;

  // Check required fields
  if (!edge.id || edge.id.length === 0) {
    throw new Error(`${context}: Missing ID`);
  }

  if (!VALID_EDGE_TYPES.includes(edge.type)) {
    throw new Error(`${context}: Invalid edge type: ${edge.type}`);
  }

  if (!edge.from || edge.from.length === 0) {
    throw new Error(`${context}: Missing 'from' field`);
  }

  if (!edge.to || edge.to.length === 0) {
    throw new Error(`${context}: Missing 'to' field`);
  }

  // Check node references
  if (!nodeIds.has(edge.from)) {
    throw new Error(`${context}: 'from' references non-existent node: ${edge.from}`);
  }

  if (!nodeIds.has(edge.to)) {
    throw new Error(`${context}: 'to' references non-existent node: ${edge.to}`);
  }

  // Check weight if present
  if (edge.weight !== undefined) {
    if (typeof edge.weight !== 'number') {
      throw new Error(`${context}: Weight must be a number`);
    }
    if (edge.weight < 0.0 || edge.weight > 1.0) {
      throw new Error(`${context}: Weight must be 0.0-1.0, got ${edge.weight}`);
    }
  }

  // Check evidence
  if (!edge.evidenceRefs || !Array.isArray(edge.evidenceRefs)) {
    throw new Error(`${context}: Missing evidenceRefs array`);
  }

  if (edge.evidenceRefs.length === 0) {
    throw new Error(`${context}: Must have at least one evidence reference`);
  }

  // Validate each evidence reference
  for (const evidence of edge.evidenceRefs) {
    validateEvidence(evidence, context);
  }

  console.log(`✓ ${context} (type: ${edge.type}, ${edge.from} → ${edge.to}, evidence count: ${edge.evidenceRefs.length})`);
}

function validateGraph(graph) {
  console.log('\n=== Validating Graph Metadata ===');

  if (!graph.metadata) {
    throw new Error('Graph missing metadata');
  }

  if (!graph.metadata.id || graph.metadata.id.length === 0) {
    throw new Error('Graph metadata missing ID');
  }

  if (!graph.metadata.version || graph.metadata.version.length === 0) {
    throw new Error('Graph metadata missing version');
  }

  if (!graph.metadata.createdAt || graph.metadata.createdAt.length === 0) {
    throw new Error('Graph metadata missing createdAt');
  }

  console.log(`✓ Graph metadata (id: ${graph.metadata.id}, version: ${graph.metadata.version})`);

  console.log('\n=== Validating Nodes ===');

  if (!graph.nodes || !Array.isArray(graph.nodes)) {
    throw new Error('Graph missing nodes array');
  }

  for (const node of graph.nodes) {
    validateNode(node);
  }

  console.log(`✓ All ${graph.nodes.length} nodes valid`);

  console.log('\n=== Validating Edges ===');

  if (!graph.edges || !Array.isArray(graph.edges)) {
    throw new Error('Graph missing edges array');
  }

  const nodeIds = new Set(graph.nodes.map(n => n.id));

  for (const edge of graph.edges) {
    validateEdge(edge, nodeIds);
  }

  console.log(`✓ All ${graph.edges.length} edges valid`);

  console.log('\n=== Validating Statistics ===');

  if (graph.stats) {
    if (graph.stats.totalNodes !== graph.nodes.length) {
      throw new Error(`Stats mismatch: totalNodes=${graph.stats.totalNodes}, actual=${graph.nodes.length}`);
    }

    if (graph.stats.totalEdges !== graph.edges.length) {
      throw new Error(`Stats mismatch: totalEdges=${graph.stats.totalEdges}, actual=${graph.edges.length}`);
    }

    if (graph.stats.avgConfidence < 0.0 || graph.stats.avgConfidence > 1.0) {
      throw new Error(`Invalid avgConfidence: ${graph.stats.avgConfidence}`);
    }

    console.log(`✓ Statistics valid (nodes: ${graph.stats.totalNodes}, edges: ${graph.stats.totalEdges}, avgConfidence: ${graph.stats.avgConfidence})`);
  }
}

function main() {
  console.log('Innovation Simulation Ontology Verification');
  console.log('===========================================\n');

  try {
    const graph = loadFixture();
    console.log('✓ Fixture loaded successfully\n');

    validateGraph(graph);

    console.log('\n=== SUCCESS ===');
    console.log('All validation checks passed!');
    console.log('PR1 acceptance criteria verified:');
    console.log('  ✓ Fixture validates against ontology rules');
    console.log('  ✓ All nodes have evidence references');
    console.log('  ✓ All edges have evidence references');
    console.log('  ✓ All confidence scores are 0.0-1.0');
    console.log('  ✓ All edge references point to existing nodes');
    console.log('  ✓ All node/edge types are valid');

    process.exit(0);
  } catch (error) {
    console.error('\n=== VALIDATION FAILED ===');
    console.error(error.message);
    process.exit(1);
  }
}

main();
