#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import process from 'node:process';

import { buildDatasetProvenanceOverlay, verifyHaplEntries } from '../index.js';

function printUsage() {
  console.log(`Usage: hapl-verify <ledger.json> --public-key <key.pem> [--overlay]\n\n` +
    `Validates a Human Annotation Provenance Ledger export and optionally prints a provenance overlay.`);
}

function parseArgs(argv) {
  const args = argv.slice(2);
  let ledgerPath;
  let publicKeyPath;
  let overlay = false;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--help' || arg === '-h') {
      printUsage();
      process.exit(0);
    }
    if (arg === '--overlay') {
      overlay = true;
      continue;
    }
    if (arg === '--public-key' || arg === '-k') {
      const next = args[index + 1];
      if (!next) {
        console.error('Missing value for --public-key');
        printUsage();
        process.exit(1);
      }
      publicKeyPath = next;
      index += 1;
      continue;
    }
    if (!ledgerPath) {
      ledgerPath = arg;
      continue;
    }

    console.error(`Unknown argument: ${arg}`);
    printUsage();
    process.exit(1);
  }

  if (!ledgerPath || !publicKeyPath) {
    console.error('Ledger path and --public-key are required.');
    printUsage();
    process.exit(1);
  }

  return {
    ledgerPath: resolve(ledgerPath),
    publicKeyPath: resolve(publicKeyPath),
    overlay,
  };
}

function loadEntries(ledgerPath) {
  let raw;
  try {
    raw = readFileSync(ledgerPath, 'utf8');
  } catch (error) {
    console.error(`Unable to read ledger file: ${error.message}`);
    process.exit(1);
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    console.error(`Ledger file is not valid JSON: ${error.message}`);
    process.exit(1);
  }

  if (Array.isArray(parsed)) {
    return parsed;
  }
  if (parsed && Array.isArray(parsed.entries)) {
    return parsed.entries;
  }

  console.error('Ledger JSON must be an array of entries or an object with an entries[] property.');
  process.exit(1);
}

function loadPublicKey(publicKeyPath) {
  try {
    return readFileSync(publicKeyPath, 'utf8');
  } catch (error) {
    console.error(`Unable to read public key: ${error.message}`);
    process.exit(1);
  }
}

function main() {
  const { ledgerPath, publicKeyPath, overlay } = parseArgs(process.argv);
  const entries = loadEntries(ledgerPath);
  const publicKey = loadPublicKey(publicKeyPath);
  const verification = verifyHaplEntries(entries, publicKey);

  if (!verification.valid) {
    console.error(`Ledger verification failed: ${verification.error ?? 'unknown error'}`);
    process.exit(1);
  }

  const root = entries.at(-1)?.hash ?? 'none';
  console.log(`Ledger verified. root=${root}`);

  if (overlay) {
    const overlayPayload = buildDatasetProvenanceOverlay(entries);
    console.log(JSON.stringify(overlayPayload, null, 2));
  }
}

main();
