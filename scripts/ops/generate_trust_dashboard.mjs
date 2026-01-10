import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const GATES = [
  {
    name: 'Repo Hygiene',
    command: ['bash', ['scripts/ci/check_repo_hygiene.sh']],
  },
  {
    name: 'Evidence Completeness',
    command: ['node', ['scripts/ci/verify_evidence_map.mjs']],
  },
  {
    name: 'Security Status',
    command: ['node', ['scripts/ci/verify_security_ledger.mjs', '--mode=hard']],
  },
  {
    name: 'Logging Safety',
    command: ['node', ['scripts/ci/check_logging_safety.mjs']],
  },
  {
    name: 'Extension Governance',
    command: ['node', ['scripts/ci/check_extensions_compliance.mjs']],
  },
  {
    name: 'Integrity Budgets',
    command: ['node', ['scripts/ci/check_integrity_budgets.mjs']],
  },
];

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};
  args.forEach((arg) => {
    const [key, value] = arg.split('=');
    if (key.startsWith('--')) {
      options[key.replace(/^--/, '')] = value ?? true;
    }
  });
  return {
    mode: options.mode ?? 'soft',
    output: options.output ?? null,
  };
}

function runGate(gate) {
  const [command, commandArgs] = gate.command;
  const result = spawnSync(command, commandArgs, { stdio: 'pipe', encoding: 'utf8' });
  return {
    ...gate,
    status: result.status === 0 ? 'PASS' : 'FAIL',
    output: `${result.stdout ?? ''}${result.stderr ?? ''}`.trim(),
  };
}

function buildReport(results, commitHash, timestamp) {
  const lines = [];
  lines.push('# Trust Dashboard');
  lines.push('');
  lines.push(`- Commit: \`${commitHash}\``);
  lines.push(`- Timestamp: ${timestamp}`);
  lines.push('');
  lines.push('| Gate | Status |');
  lines.push('| --- | --- |');
  results.forEach((result) => {
    lines.push(`| ${result.name} | ${result.status} |`);
  });
  lines.push('');
  results.forEach((result) => {
    lines.push(`## ${result.name}`);
    lines.push('');
    lines.push(`**Status:** ${result.status}`);
    lines.push('');
    if (result.output) {
      lines.push('```');
      lines.push(result.output);
      lines.push('```');
      lines.push('');
    }
  });
  return lines.join('\n');
}

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function main() {
  const { mode, output } = parseArgs();
  const commitHash = spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).stdout.trim();
  const timestamp = new Date().toISOString();

  const results = GATES.map((gate) => runGate(gate));
  const report = buildReport(results, commitHash, timestamp);

  if (output) {
    ensureDir(output);
    fs.writeFileSync(output, `${report}\n`, 'utf8');
  }
  console.log(report);

  const failures = results.filter((result) => result.status !== 'PASS');
  if (failures.length > 0 && mode === 'hard') {
    process.exitCode = 1;
  }
}

main();
