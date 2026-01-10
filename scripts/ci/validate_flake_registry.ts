import fs from 'node:fs';
import path from 'node:path';
import {
  validateFlakeRegistry,
  FlakeEntry,
} from './lib/flake-registry';

type Options = {
  registryPath: string;
  schemaPath: string;
  maxDurationDays: number;
  reportPath?: string;
};

const DEFAULT_REGISTRY = path.join('.github', 'flake-registry.yml');
const DEFAULT_SCHEMA = path.join('schemas', 'flake-registry.schema.json');
const DEFAULT_MAX_DURATION = 14;
const ALLOW_LONGER = new Set<string>([]);

function parseArgs(): Options {
  const args = process.argv.slice(2);
  let registryPath = DEFAULT_REGISTRY;
  let schemaPath = DEFAULT_SCHEMA;
  let maxDurationDays = DEFAULT_MAX_DURATION;
  let reportPath: string | undefined;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--registry') {
      registryPath = args[i + 1];
      i += 1;
    } else if (arg === '--schema') {
      schemaPath = args[i + 1];
      i += 1;
    } else if (arg === '--max-duration') {
      maxDurationDays = Number.parseInt(args[i + 1] ?? '', 10);
      i += 1;
    } else if (arg === '--report') {
      reportPath = args[i + 1];
      i += 1;
    }
  }

  if (Number.isNaN(maxDurationDays) || maxDurationDays <= 0) {
    throw new Error(`Invalid --max-duration value: ${maxDurationDays}`);
  }

  return {
    registryPath,
    schemaPath,
    maxDurationDays,
    reportPath,
  };
}

function buildReport(flakes: FlakeEntry[]): object {
  const now = new Date().toISOString();
  return {
    generated_at: now,
    total: flakes.length,
    by_scope: flakes.reduce<Record<string, number>>((acc, flake) => {
      acc[flake.scope] = (acc[flake.scope] ?? 0) + 1;
      return acc;
    }, {}),
  };
}

function main(): void {
  const options = parseArgs();
  const { registry, errors } = validateFlakeRegistry(options.registryPath, options.schemaPath, {
    maxDurationDays: options.maxDurationDays,
    allowLonger: ALLOW_LONGER,
  });

  if (errors.length > 0) {
    const message = errors.map((err) => `- ${err}`).join('\n');
    throw new Error(`Flake registry validation failed:\n${message}`);
  }

  if (options.reportPath) {
    const report = buildReport(registry.flakes);
    const absolutePath = path.resolve(options.reportPath);
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  }

  // eslint-disable-next-line no-console
  console.log(`Flake registry validated (${registry.flakes.length} entries).`);
}

main();
