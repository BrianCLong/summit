#!/usr/bin/env node

/**
 * Evidence Graph Builder
 * Transforms evidence.json (manifest/index) into DOT format for visualization.
 */

import fs from 'node:fs';
import path from 'node:path';

function generateDot(evidenceData) {
  let dot = 'digraph EvidenceGraph {\n';
  dot += '  rankdir=LR;\n';
  dot += '  node [shape=box, fontname="Helvetica"];\n\n';

  const items = evidenceData.items || [];

  items.forEach(item => {
    const id = item.evidence_id || item.id;
    const label = `${id}\\n${item.item_slug || ''}`;
    dot += `  "${id}" [label="${label}", color=blue];\n`;

    if (item.lineage) {
      if (item.lineage.parent_id) {
        dot += `  "${item.lineage.parent_id}" -> "${id}" [label="derived-from"];\n`;
      }
      if (item.lineage.inputs) {
        item.lineage.inputs.forEach(input => {
          dot += `  "${input}" -> "${id}" [label="input"];\n`;
        });
      }
    }
  });

  dot += '}\n';
  return dot;
}

function main() {
  const inputFile = process.argv[2] || 'evidence/index.json';
  const outputFile = process.argv[3] || 'evidence_graph.dot';

  if (!fs.existsSync(inputFile)) {
    console.error(`Input file ${inputFile} not found.`);
    process.exit(1);
  }

  try {
    const data = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
    const dot = generateDot(data);
    fs.writeFileSync(outputFile, dot);
    console.log(`Successfully generated evidence graph at ${outputFile}`);
  } catch (err) {
    console.error(`Failed to generate evidence graph: ${err.message}`);
    process.exit(1);
  }
}

main();
