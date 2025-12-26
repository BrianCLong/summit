#!/usr/bin/env node

import { Command } from 'commander';
import fs from 'fs';
import yaml from 'js-yaml';
import path from 'path';

const program = new Command();

program
  .version('1.0.0')
  .description('Generates SECURITY.md from a YAML index of security controls.')
  .option('-i, --input <path>', 'Path to the input YAML file', 'docs/governance/due-diligence/index.yaml')
  .option('-o, --output <path>', 'Path to the output Markdown file', 'SECURITY.md')
  .parse(process.argv);

const options = program.opts();

try {
  const inputFile = path.resolve(process.cwd(), options.input);
  const outputFile = path.resolve(process.cwd(), options.output);

  const yamlContent = fs.readFileSync(inputFile, 'utf8');
  const data = yaml.load(yamlContent);

  let markdownContent = `# Security Policy\n\n`;
  markdownContent += `*This document is auto-generated from the [Due-Diligence Index](./${path.relative(process.cwd(), inputFile)}). Do not edit it directly.*\n\n`;
  markdownContent += `## Security Controls and Governance\n\n`;
  markdownContent += `The following table summarizes the key security controls and governance principles of the Summit platform, with links to their verifiable evidence.\n\n`;

  for (const control of data.controls) {
    markdownContent += `### ${control.id}: ${control.name}\n\n`;
    markdownContent += `**Description:** ${control.description}\n\n`;
    markdownContent += `**Category:** ${control.category} | **Source:** [${path.basename(control.source)}](${control.source})\n\n`;

    markdownContent += `| Invariant | Evidence Type | Evidence Path | Description |\n`;
    markdownContent += `|-----------|---------------|---------------|-------------|\n`;

    for (const invariant of control.invariants) {
      for (const evidence of invariant.evidence) {
        markdownContent += `| ${invariant.description} | \`${evidence.type}\` | [${evidence.path}](${evidence.path}) | ${evidence.description} |\n`;
      }
    }
    markdownContent += `\n`;
  }

  fs.writeFileSync(outputFile, markdownContent, 'utf8');
  console.log(`Successfully generated ${outputFile}`);

} catch (error) {
  console.error('Error generating SECURITY.md:', error);
  process.exit(1);
}
