import fs from 'node:fs';
import path from 'node:path';
import { loadFlakeRegistry, getFlakeById } from './lib/flake-registry';

const DEFAULT_ENCOUNTERS = path.join('artifacts', 'flake', 'flake-encounters.jsonl');

type EncounterRecord = {
  id: string;
  scope: string;
  target: string;
  occurred_at: string;
  error?: string;
};

type Options = {
  registryPath: string;
  encountersPath: string;
  summaryPath?: string;
  failOnQuarantine: boolean;
  reportPath?: string;
};

function parseArgs(): Options {
  const args = process.argv.slice(2);
  let registryPath = path.join('.github', 'flake-registry.yml');
  let encountersPath = DEFAULT_ENCOUNTERS;
  let summaryPath = process.env.GITHUB_STEP_SUMMARY;
  let failOnQuarantine = false;
  let reportPath: string | undefined;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--registry') {
      registryPath = args[i + 1];
      i += 1;
    } else if (arg === '--encounters') {
      encountersPath = args[i + 1];
      i += 1;
    } else if (arg === '--summary') {
      summaryPath = args[i + 1];
      i += 1;
    } else if (arg === '--fail-on-quarantine') {
      failOnQuarantine = true;
    } else if (arg === '--report') {
      reportPath = args[i + 1];
      i += 1;
    }
  }

  return { registryPath, encountersPath, summaryPath, failOnQuarantine, reportPath };
}

function readEncounters(encountersPath: string): EncounterRecord[] {
  if (!fs.existsSync(encountersPath)) {
    return [];
  }
  const lines = fs.readFileSync(encountersPath, 'utf8').split(/\r?\n/).filter(Boolean);
  return lines.map((line) => JSON.parse(line) as EncounterRecord);
}

function renderSummary(encounters: EncounterRecord[], registryPath: string): string {
  const registry = loadFlakeRegistry(registryPath);
  if (encounters.length === 0) {
    return '### Flake Quarantine\n\nNo quarantined flakes encountered in this run.\n';
  }

  const rows = encounters.map((entry) => {
    const registryEntry = getFlakeById(registry, entry.id);
    const owner = registryEntry?.owner ?? 'unknown';
    const ticket = registryEntry?.ticket ?? 'unknown';
    return `| ${entry.id} | ${entry.scope} | ${entry.target} | ${owner} | ${ticket} | ${entry.occurred_at} |`;
  });

  return [
    '### Flake Quarantine',
    '',
    `Quarantined flakes encountered: **${encounters.length}**`,
    '',
    '| ID | Scope | Target | Owner | Ticket | Occurred |',
    '|----|-------|--------|-------|--------|----------|',
    ...rows,
    '',
  ].join('\n');
}

function main(): void {
  const options = parseArgs();
  const encounters = readEncounters(options.encountersPath);
  const summary = renderSummary(encounters, options.registryPath);

  if (options.summaryPath) {
    fs.appendFileSync(options.summaryPath, `${summary}\n`);
  }

  if (options.reportPath) {
    const report = {
      generated_at: new Date().toISOString(),
      total: encounters.length,
      encounters,
    };
    const absolutePath = path.resolve(options.reportPath);
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  }

  if (options.failOnQuarantine && encounters.length > 0) {
    throw new Error(`Flake quarantine encountered ${encounters.length} time(s).`);
  }

  // eslint-disable-next-line no-console
  console.log(`Flake encounter report generated (${encounters.length} entries).`);
}

main();
