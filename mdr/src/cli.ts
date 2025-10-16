#!/usr/bin/env node
import path from 'path';
import process from 'process';
import { MetricRegistry } from './registry';
import { Dialect } from './types';

function usage(): never {
  console.error(`Usage:
  mdr compile <dialect> [--metric <name>] [--specs <path>] [--out <path>]
  mdr diff <metric> <leftVersion> <rightVersion> [--specs <path>]
  mdr test <dialect> [--metric <name>] [--specs <path>] [--golden <path>]
  mdr golden <dialect> [--metric <name>] [--specs <path>] [--golden <path>]`);
  process.exit(1);
}

function parseFlags(args: string[]): Record<string, string> {
  const flags: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    const token = args[i];
    if (token.startsWith('--')) {
      const key = token.slice(2);
      const value = args[i + 1];
      if (!value || value.startsWith('--')) {
        throw new Error(`Flag ${token} requires a value.`);
      }
      flags[key] = value;
      i++;
    }
  }
  return flags;
}

function resolveRegistry(flags: Record<string, string>): MetricRegistry {
  return new MetricRegistry({
    specsRoot: flags.specs ? path.resolve(flags.specs) : undefined,
    outputRoot: flags.out ? path.resolve(flags.out) : undefined,
    goldenRoot: flags.golden ? path.resolve(flags.golden) : undefined
  });
}

function asDialect(value: string | undefined): Dialect {
  if (value === 'bigquery' || value === 'snowflake' || value === 'postgres') {
    return value;
  }
  throw new Error(`Unsupported dialect ${value ?? '<missing>'}`);
}

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  if (!command) {
    usage();
  }

  try {
    if (command === 'compile') {
      const dialect = asDialect(rest[0]);
      const flags = parseFlags(rest.slice(1));
      const registry = resolveRegistry(flags);
      const written = registry.writeCompiledArtifacts(dialect, flags.metric);
      if (written.length === 0) {
        console.log('No artifacts changed.');
      } else {
        console.log('Wrote artifacts:');
        for (const file of written) {
          console.log(`  ${file}`);
        }
      }
      return;
    }

    if (command === 'diff') {
      const [metricName, left, right, ...flagArgs] = rest;
      if (!metricName || !left || !right) {
        usage();
      }
      const flags = parseFlags(flagArgs ?? []);
      const registry = resolveRegistry(flags);
      const diff = registry.diff(metricName, Number(left), Number(right));
      console.log(diff);
      return;
    }

    if (command === 'test') {
      const dialect = asDialect(rest[0]);
      const flags = parseFlags(rest.slice(1));
      const registry = resolveRegistry(flags);
      const failures = registry.runConformance(dialect, flags.metric);
      if (failures.length > 0) {
        console.error('Conformance failures detected:');
        for (const failure of failures) {
          console.error(`- ${failure}`);
        }
        process.exitCode = 1;
      } else {
        console.log('All compiled SQL artifacts match golden outputs.');
      }
      return;
    }

    if (command === 'golden') {
      const dialect = asDialect(rest[0]);
      const flags = parseFlags(rest.slice(1));
      const registry = resolveRegistry(flags);
      const written = registry.exportGoldenFixtures(dialect, flags.metric);
      console.log('Exported golden fixtures:');
      for (const file of written) {
        console.log(`  ${file}`);
      }
      return;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exitCode = 1;
    return;
  }

  usage();
}

main();
