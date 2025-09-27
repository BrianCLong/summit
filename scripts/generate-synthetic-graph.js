#!/usr/bin/env node
import { writeFileSync } from 'fs';

const nodeCount = parseInt(process.argv[2] || '10000', 10);
const edgeCount = parseInt(process.argv[3] || String(nodeCount * 2), 10);

const nodes = Array.from({ length: nodeCount }, (_, i) => ({
  id: `n${i}`,
  properties: { name: `Node ${i}` }
}));

const edges = [];
for (let i = 0; i < edgeCount; i++) {
  const source = `n${Math.floor(Math.random() * nodeCount)}`;
  let target = `n${Math.floor(Math.random() * nodeCount)}`;
  if (target === source) {
    target = `n${(i + 1) % nodeCount}`;
  }
  edges.push({ source, target, type: 'LINK' });
}

const graph = { nodes, edges };
const file = `graph-${nodeCount}-${edgeCount}.json`;
writeFileSync(file, JSON.stringify(graph));
console.log(`Generated ${file}`);
