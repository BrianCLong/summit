#!/usr/bin/env -S npx tsx

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { program } from 'commander';

const CONFIG_PATH = path.join(process.cwd(), 'ci/gate-ratchet.yml');

program
  .requiredOption('--gate-id <id>', 'Gate ID')
  .requiredOption('--command <cmd>', 'Command to run')
  .parse(process.argv);

const options = program.opts();

// Read config
let config: any;
try {
  const fileContent = fs.readFileSync(CONFIG_PATH, 'utf8');
  config = yaml.load(fileContent);
} catch (e) {
  console.error('Error reading config:', e);
  process.exit(1);
}

const gate = config.gates.find((g: any) => g.id === options.gateId);
if (!gate) {
  console.error(`Gate ${options.gateId} not found in config.`);
  process.exit(1);
}

console.log(`Running gate: ${gate.name} (${gate.status})`);
const startTime = Date.now();

const child = spawn(options.command, {
  shell: true,
  stdio: 'inherit',
});

child.on('close', (code) => {
  const endTime = Date.now();
  const durationSeconds = (endTime - startTime) / 1000;
  const outcome = code === 0 ? 'PASS' : 'FAIL';

  // Write summary (using the other script via child_process or direct import - direct execution is safer for now)
  const summaryScript = path.join(process.cwd(), 'scripts/ci/write_gate_summary.ts');
  const summaryArgs = [
    summaryScript,
    '--gate-id', options.gateId,
    '--outcome', outcome,
    '--duration', durationSeconds.toString()
  ];

  const summaryProcess = spawn('npx', ['tsx', ...summaryArgs], { stdio: 'inherit' });

  summaryProcess.on('close', () => {
    // Decision logic
    if (outcome === 'PASS') {
      console.log(`✅ Gate ${gate.name} passed.`);
      process.exit(0);
    } else {
      if (gate.status === 'required') {
        console.error(`❌ Gate ${gate.name} failed and is REQUIRED.`);
        process.exit(code || 1);
      } else {
        console.warn(`⚠️ Gate ${gate.name} failed but is REPORT_ONLY.`);
        console.log(`::warning title=Gate ${gate.name} Failed::This gate is currently report-only but would have blocked the build.`);
        process.exit(0);
      }
    }
  });
});
