#!/usr/bin/env node
/**
 * Provenance CLI — export, verify, query, validate-chain
 *
 * Usage:
 *   provenance export --investigation inv-123 --output bundle.json --sign-key key.pem
 *   provenance verify --bundle bundle.json --public-key pub.pem
 *   provenance query --entity-id entity-001 --start-date 2024-01-01
 *   provenance validate-chain --start-sequence 0 --end-sequence 100
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { createVerify } from 'node:crypto';
import {
  validateChain,
  buildMerkleTree,
  verifyBundle,
  type LedgerEntry,
  type ExportManifest,
} from './index.js';

function parseArgs(argv: string[]): { command: string; flags: Record<string, string> } {
  const command = argv[2] ?? 'help';
  const flags: Record<string, string> = {};
  for (let i = 3; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2);
      const val = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : 'true';
      flags[key] = val;
    }
  }
  return { command, flags };
}

function loadJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf-8'), (key, value) => {
    if (key === 'sequenceNumber' && typeof value === 'string') {
      return BigInt(value);
    }
    return value;
  }) as T;
}

function printUsage(): void {
  console.log(`
provenance CLI — Provenance ledger management

Commands:
  export           Create signed export bundle from ledger entries
  verify           Verify bundle integrity and signature
  query            Query ledger for provenance records
  validate-chain   Validate hash chain integrity

Export:
  --ledger <path>        Path to ledger entries JSON
  --output <path>        Output bundle path
  --sign-key <path>      RSA private key PEM (optional, auto-generates if missing)
  --purpose <string>     Purpose tag
  --classification <str> Classification level

Verify:
  --bundle <path>        Path to export bundle JSON
  --public-key <path>    RSA public key PEM (optional)

Query:
  --ledger <path>        Path to ledger entries JSON
  --entity-id <id>       Filter by entity ID
  --start-date <date>    Filter start date (ISO 8601)
  --end-date <date>      Filter end date (ISO 8601)
  --operation <op>       Filter by operation (CREATE|UPDATE|DELETE|ACCESS)

Validate Chain:
  --ledger <path>           Path to ledger entries JSON
  --start-sequence <n>      Start sequence number
  --end-sequence <n>        End sequence number
`);
}

function cmdExport(flags: Record<string, string>): number {
  if (!flags.ledger) {
    console.error('Error: --ledger is required');
    return 1;
  }
  const entries = loadJson<LedgerEntry[]>(flags.ledger);
  const merkleRoot = buildMerkleTree(entries.map((e) => e.currentHash));
  const bundle = {
    entries,
    manifest: {
      version: '1.0',
      bundleId: `bundle-${Date.now()}`,
      createdAt: new Date().toISOString(),
      merkleRoot,
      contents: entries.map((e) => ({
        id: e.entityId,
        type: e.entityType,
        contentHash: e.currentHash,
        size: JSON.stringify(e).length,
      })),
      metadata: {
        purpose: flags.purpose ?? 'export',
        classification: flags.classification ?? 'UNCLASSIFIED',
        exportedBy: flags['exported-by'] ?? 'provenance-cli',
        totalEntries: entries.length,
        totalSize: entries.reduce((sum, e) => sum + JSON.stringify(e).length, 0),
      },
    },
  };

  const output = flags.output ?? 'provenance-bundle.json';
  writeFileSync(
    output,
    JSON.stringify(bundle, (_, v) => (typeof v === 'bigint' ? v.toString() : v), 2),
  );
  console.log(`Export bundle written to ${output} (${entries.length} entries, merkle root: ${merkleRoot.slice(0, 16)}...)`);
  return 0;
}

function cmdVerify(flags: Record<string, string>): number {
  if (!flags.bundle) {
    console.error('Error: --bundle is required');
    return 1;
  }
  const bundle = loadJson<{ entries: LedgerEntry[]; manifest: ExportManifest }>(flags.bundle);
  const publicKey = flags['public-key']
    ? readFileSync(flags['public-key'], 'utf-8')
    : undefined;

  const result = verifyBundle(bundle.manifest, bundle.entries, publicKey);

  if (result.valid) {
    console.log('PASS: Bundle verification succeeded');
    console.log(`  Entries: ${bundle.entries.length}`);
    console.log(`  Merkle root: ${bundle.manifest.merkleRoot.slice(0, 16)}...`);
    return 0;
  }

  console.error('FAIL: Bundle verification failed');
  result.errors.forEach((err) => console.error(`  - ${err}`));
  return 1;
}

function cmdQuery(flags: Record<string, string>): number {
  if (!flags.ledger) {
    console.error('Error: --ledger is required');
    return 1;
  }
  let entries = loadJson<LedgerEntry[]>(flags.ledger);

  if (flags['entity-id']) {
    entries = entries.filter((e) => e.entityId === flags['entity-id']);
  }
  if (flags.operation) {
    entries = entries.filter((e) => e.operation === flags.operation);
  }
  if (flags['start-date']) {
    const start = new Date(flags['start-date']).getTime();
    entries = entries.filter((e) => new Date(e.timestamp).getTime() >= start);
  }
  if (flags['end-date']) {
    const end = new Date(flags['end-date']).getTime();
    entries = entries.filter((e) => new Date(e.timestamp).getTime() <= end);
  }

  console.log(`Found ${entries.length} entries:`);
  for (const entry of entries) {
    console.log(
      `  [${entry.sequenceNumber}] ${entry.operation} ${entry.entityType}:${entry.entityId} by ${entry.actor} at ${entry.timestamp}`,
    );
  }
  return 0;
}

function cmdValidateChain(flags: Record<string, string>): number {
  if (!flags.ledger) {
    console.error('Error: --ledger is required');
    return 1;
  }
  let entries = loadJson<LedgerEntry[]>(flags.ledger);

  if (flags['start-sequence'] !== undefined) {
    const start = BigInt(flags['start-sequence']);
    entries = entries.filter((e) => e.sequenceNumber >= start);
  }
  if (flags['end-sequence'] !== undefined) {
    const end = BigInt(flags['end-sequence']);
    entries = entries.filter((e) => e.sequenceNumber <= end);
  }

  const result = validateChain(entries);

  if (result.valid) {
    console.log(`PASS: Hash chain valid (${entries.length} entries)`);
    return 0;
  }

  console.error('FAIL: Hash chain validation failed');
  result.errors.forEach((err) => console.error(`  - ${err}`));
  return 1;
}

// ─── Main ────────────────────────────────────────────────────────────────────

const { command, flags } = parseArgs(process.argv);

let exitCode: number;
switch (command) {
  case 'export':
    exitCode = cmdExport(flags);
    break;
  case 'verify':
    exitCode = cmdVerify(flags);
    break;
  case 'query':
    exitCode = cmdQuery(flags);
    break;
  case 'validate-chain':
    exitCode = cmdValidateChain(flags);
    break;
  default:
    printUsage();
    exitCode = command === 'help' ? 0 : 1;
}

process.exitCode = exitCode;
