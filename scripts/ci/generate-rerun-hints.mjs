#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import yargs from 'yargs-parser';

const main = () => {
  const args = yargs(process.argv.slice(2));

  const phase = args.phase || 'Unknown Phase';
  const command = args.command || 'echo "No command provided"';
  const failingTests = args.failingTests ? args.failingTests.split(',').map(t => t.trim()) : [];
  const flakesFile = args.flakesFile || 'docs/ci/KNOWN_FLAKES.yml';
  const outputFile = 'artifacts/triage/rerun_hints.md';

  let knownFlakes = [];
  if (fs.existsSync(flakesFile)) {
    try {
      knownFlakes = yaml.load(fs.readFileSync(flakesFile, 'utf8')) || [];
    } catch (e) {
      console.error(`Error parsing flakes file: ${flakesFile}`, e);
    }
  }

  const matchingFlakes = knownFlakes.filter(flake =>
    failingTests.some(test => test.includes(flake.test_pattern))
  );

  const pnpmVersion = (process.env.PNPM_VERSION || execSync('pnpm --version').toString()).trim();
  const nodeVersion = (process.env.NODE_VERSION || execSync('node --version').toString()).trim();

  const hintSections = [];

  // Section 1: Header
  hintSections.push(`### Rerun Hints for: \`${phase}\``);

  // Section 2: Local Reproduction
  hintSections.push(
    '#### Local Reproduction',
    '```bash',
    `# 1. Ensure your environment matches CI`,
    `#    Node: v${nodeVersion}, pnpm: v${pnpmVersion}`,
    `# 2. Run the exact failing command:`,
    command,
    '```'
  );

  // Section 3: Targeted Test Reruns
  if (failingTests.length > 0) {
    hintSections.push('#### Targeted Test Reruns');
    hintSections.push('To rerun only the failing tests, use the following commands. Rerun up to 10 specific files for precision.');
    hintSections.push('```bash');
    failingTests.slice(0, 10).forEach(test => {
      // Simple heuristic to detect test runner.
      if (command.includes('jest') || command.includes('vitest')) {
        hintSections.push(`${command} --runTestsByPath ${test}`);
      } else if (command.includes('node --test')) {
         hintSections.push(`${command} ${test}`);
      } else {
        // Fallback for other runners, might need refinement
        hintSections.push(`${command} -- -t "${test.replace(/"/g, '\\"')}"`);
      }
    });
    hintSections.push('```');
  }

  // Section 4: Known Flake Matches
  if (matchingFlakes.length > 0) {
    hintSections.push('#### Known Flake Matches');
    hintSections.push('Some failures match known flaky tests. This does **not** change the outcome, but provides context.');
    matchingFlakes.forEach(flake => {
      hintSections.push(`- **ID:** \`${flake.id}\``);
      hintSections.push(`  - **Owner:** ${flake.owner}`);
      hintSections.push(`  - **Ticket:** ${flake.ticket}`);
      hintSections.push(`  - **Expires:** ${flake.expires_on}`);
    });
  }

  // Section 5: Environment Parity
  hintSections.push(
    '#### Environment Parity',
    '- **Node.js Version:** `v${nodeVersion}`',
    '- **pnpm Version:** `v${pnpmVersion}`',
    '- **CI Environment:** Check the workflow file for any specific environment variables.'
  );

  const markdown = hintSections.join('\n\n');

  // Ensure output directory exists
  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(outputFile, markdown);

  console.log(`✅ Rerun hints generated at: ${outputFile}`);
};

main();
