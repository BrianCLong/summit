#!/usr/bin/env node
/**
 * Quick test of the dataset generator (no Neo4j required)
 */

import { generateDataset, generateCypherStatements } from './fixtures/dataset-generator.js';

console.log('Testing dataset generator...\n');

// Test small dataset
const dataset = generateDataset('small', 'test');

console.log('✅ Dataset generated:');
console.log(`   Size: ${dataset.metadata.size}`);
console.log(`   Nodes: ${dataset.metadata.nodeCount}`);
console.log(`   Edges: ${dataset.metadata.edgeCount}`);
console.log(`   Avg Degree: ${dataset.metadata.avgDegree.toFixed(2)}`);
console.log(`   Investigation ID: ${dataset.metadata.investigationId}`);

// Test Cypher generation
const statements = generateCypherStatements(dataset);
console.log(`\n✅ Generated ${statements.length} Cypher statements`);

// Sample node
const sampleNode = dataset.nodes[0];
console.log('\n📋 Sample Node:');
console.log(`   ID: ${sampleNode.id}`);
console.log(`   Type: ${sampleNode.type}`);
console.log(`   Label: ${sampleNode.label}`);
console.log(`   Confidence: ${sampleNode.properties.confidence.toFixed(2)}`);

// Sample edge
const sampleEdge = dataset.edges[0];
console.log('\n📋 Sample Edge:');
console.log(`   ID: ${sampleEdge.id}`);
console.log(`   Type: ${sampleEdge.type}`);
console.log(`   From: ${sampleEdge.srcId} → To: ${sampleEdge.dstId}`);
console.log(`   Confidence: ${sampleEdge.properties.confidence.toFixed(2)}`);

// Test all sizes
console.log('\n📊 All Dataset Sizes:');
for (const size of ['small', 'medium', 'large', 'xl']) {
  const ds = generateDataset(size, `test-${size}`);
  console.log(`   ${size.padEnd(6)}: ${ds.metadata.nodeCount.toLocaleString().padStart(7)} nodes, ${ds.metadata.edgeCount.toLocaleString().padStart(8)} edges`);
}

console.log('\n✅ Dataset generator test passed!');
console.log('\nNext steps:');
console.log('  1. Start Neo4j: docker compose -f ../../docker-compose.neo4j.yml up -d');
console.log('  2. Run benchmark: npm run bench:quick');
console.log('  3. View report: npm run report');
