#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

type Args = {
  snapshotPath?: string;
  schemaPath: string;
};

function parseArgs(argv: string[]): Args {
  const args: Args = {
    schemaPath: resolve('trust', 'trust-snapshot.schema.json'),
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--snapshot') args.snapshotPath = argv[++i];
    else if (arg === '--schema') args.schemaPath = argv[++i];
    else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  return args;
}

function printHelp(): void {
  console.log(`Validate trust snapshot JSON against schema.

Usage:
  pnpm exec tsx scripts/release/validate_trust_snapshot.ts --snapshot path/to/trust-snapshot.json

Options:
  --snapshot <path>   Path to trust snapshot JSON (required)
  --schema <path>     Path to trust snapshot schema
`);
}

function fail(message: string): never {
  console.error(`Trust snapshot validation failed: ${message}`);
  process.exit(1);
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  if (!args.snapshotPath) {
    fail('Snapshot path is required.');
  }

  const schema = JSON.parse(readFileSync(args.schemaPath, 'utf8'));
  const snapshot = JSON.parse(readFileSync(args.snapshotPath, 'utf8'));

  const ajv = new Ajv({ allErrors: true });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  const valid = validate(snapshot);

  if (!valid) {
    const details = validate.errors?.map(err => `${err.instancePath} ${err.message}`).join('; ');
    fail(details || 'Unknown schema validation error');
  }

  console.log('Trust snapshot schema validation passed.');
}

main();
