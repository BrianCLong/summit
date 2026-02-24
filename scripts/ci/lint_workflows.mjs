#!/usr/bin/env node
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import yaml from 'js-yaml';

const WORKFLOWS_DIR = '.github/workflows';

function lintWorkflow(filePath) {
  const content = readFileSync(filePath, 'utf8');
  const errors = [];

  try {
    yaml.load(content, {
      filename: filePath,
      onWarning: (warning) => {
        errors.push(`Warning: ${warning.message}`);
      }
    });
  } catch (error) {
    errors.push(`Parse Error: ${error.message}`);
  }

  const lines = content.split('\n');
  lines.forEach((line, index) => {
    if (line.includes('\t')) {
      errors.push(`Line ${index + 1}: Contains tab characters (use spaces)`);
    }
    if (line.match(/\s+$/)) {
      errors.push(`Line ${index + 1}: Trailing whitespace`);
    }
  });

  return errors;
}

function main() {
  const workflowsDir = resolve(WORKFLOWS_DIR);
  if (!existsSync(workflowsDir)) return;

  const files = readdirSync(workflowsDir).filter(f => f.endsWith('.yml') || f.endsWith('.yaml'));
  let totalErrors = 0;

  for (const file of files) {
    const errors = lintWorkflow(join(workflowsDir, file));
    if (errors.length > 0) {
      console.log(`❌ ${file}:`);
      errors.forEach(err => console.log(`  - ${err}`));
      totalErrors += errors.length;
    }
  }

  if (totalErrors > 0) process.exit(1);
  console.log('✅ All workflows passed hygiene check.');
}

import { fileURLToPath } from 'node:url';
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}

export { lintWorkflow };
