#!/usr/bin/env node
import fs from 'node:fs/promises';
import process from 'node:process';
import { scanTimestampKeys } from './lib/evidence_id_consistency.mjs';

const args = process.argv.slice(2);
const mode = args[0];
const files = args.slice(1);

if (!mode || files.length === 0) {
  console.error(
    'Usage: scan_timestamp_keys.mjs --disallow|--require <json files...>',
  );
  process.exit(1);
}

const requireTimestamps = mode === '--require';
const disallowTimestamps = mode === '--disallow';

if (!requireTimestamps && !disallowTimestamps) {
  console.error('Mode must be --disallow or --require.');
  process.exit(1);
}

let found = [];
for (const file of files) {
  const raw = await fs.readFile(file, 'utf8');
  const parsed = JSON.parse(raw);
  const matches = scanTimestampKeys(parsed);
  if (matches.length > 0) {
    found.push({ file, matches });
  }
}

if (disallowTimestamps) {
  if (found.length > 0) {
    console.error(
      `Timestamp keys found where disallowed:\n${found
        .map(
          (entry) => `${entry.file}: ${entry.matches.join(', ')}`,
        )
        .join('\n')}`,
    );
    process.exit(1);
  }
  process.exit(0);
}

if (found.length === 0) {
  console.error('Required timestamp keys were not found.');
  process.exit(1);
}
