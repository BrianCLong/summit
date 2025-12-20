#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createPublicKey } from 'node:crypto';

import { canonicalString } from './canonicalize.js';
import { hashFile } from './hash.js';
import { LedgerAppendInput, LedgerFile, appendLedgerEntry, verifyLedger } from './ledger.js';
import {
  ExportManifest,
  ManifestVerificationOptions,
  buildEvidenceChain,
  calculateManifestHash,
  signManifest,
  verifyManifest,
} from './manifest.js';

export * from './canonicalize.js';
export * from './hash.js';
export * from './ledger.js';
export * from './manifest.js';
export * from './signing.js';

interface ParsedArgs {
  command?: string;
  positional: string[];
  flags: Record<string, string | boolean>;
}

function parseArgs(argv: string[]): ParsedArgs {
  const [command, ...rest] = argv;
  const positional: string[] = [];
  const flags: Record<string, string | boolean> = {};

  for (let i = 0; i < rest.length; i += 1) {
    const arg = rest[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = rest[i + 1];
      if (next && !next.startsWith('--')) {
        flags[key] = next;
        i += 1;
      } else {
        flags[key] = true;
      }
    } else {
      positional.push(arg);
    }
  }

  return { command, positional, flags };
}

function loadJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function saveJson(path: string, data: unknown) {
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function ensureLedger(path: string, ledgerId?: string): LedgerFile {
  if (existsSync(path)) {
    return loadJson<LedgerFile>(path);
  }

  return {
    version: '1.0',
    ledgerId: ledgerId ?? 'default-ledger',
    publicKeys: [],
    entries: [],
    rootHash: '',
  };
}

function ensurePublicKey(ledger: LedgerFile, keyId: string, privateKeyPem: string | Buffer) {
  const existing = ledger.publicKeys.find((key) => key.keyId === keyId);
  if (existing) {
    return;
  }

  const publicKeyPem = createPublicKey(privateKeyPem).export({ type: 'spki', format: 'pem' }).toString();
  ledger.publicKeys.push({ keyId, algorithm: 'ed25519', publicKey: publicKeyPem });
}

function appendFromCli(flags: Record<string, string | boolean>) {
  const ledgerPath = flags.ledger as string;
  const privateKeyPath = flags['private-key'] as string;
  const keyId = flags['key-id'] as string;
  const claimId = flags.claim as string;
  const entityId = flags.entity as string;
  const evidenceId = flags.evidence as string;
  const stage = flags.stage as string;
  const contentHash = flags.hash as string;
  const actor = (flags.actor as string) ?? 'unknown';
  const ledgerId = (flags['ledger-id'] as string) ?? 'export-ledger';
  const timestamp = flags.timestamp as string | undefined;
  const artifactUri = flags['artifact-uri'] as string | undefined;
  const metadataPath = flags.metadata as string | undefined;

  if (!ledgerPath || !privateKeyPath || !keyId || !claimId || !entityId || !evidenceId || !stage || !contentHash) {
    throw new Error('missing required flag for append-ledger-entry');
  }

  const privateKeyPem = readFileSync(privateKeyPath, 'utf8');
  const ledger = ensureLedger(ledgerPath, ledgerId);
  ensurePublicKey(ledger, keyId, privateKeyPem);

  let metadata: Record<string, unknown> | undefined;
  if (metadataPath) {
    metadata = loadJson<Record<string, unknown>>(metadataPath);
  }

  const input: LedgerAppendInput = {
    claimId,
    entityId,
    evidenceId,
    stage,
    contentHash,
    actor,
    signingKeyId: keyId,
    timestamp,
    artifactUri,
    metadata,
  };

  const entry = appendLedgerEntry(ledger, input, privateKeyPem);
  saveJson(ledgerPath, ledger);
  console.log(JSON.stringify(entry, null, 2));
}

function verifyLedgerCli(flags: Record<string, string | boolean>) {
  const ledgerPath = flags.ledger as string;
  if (!ledgerPath) {
    throw new Error('verify-ledger requires --ledger');
  }
  const ledger = loadJson<LedgerFile>(ledgerPath);
  const result = verifyLedger(ledger);
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.valid ? 0 : 1;
}

function signManifestCli(flags: Record<string, string | boolean>) {
  const manifestPath = flags.manifest as string;
  const privateKeyPath = flags['private-key'] as string;
  const keyId = flags['key-id'] as string;
  const outPath = (flags.out as string) ?? manifestPath;
  if (!manifestPath || !privateKeyPath || !keyId) {
    throw new Error('sign-manifest requires --manifest, --private-key, and --key-id');
  }

  const manifest = loadJson<ExportManifest>(manifestPath);
  const privateKey = readFileSync(privateKeyPath, 'utf8');
  const integrity = signManifest(manifest, privateKey, keyId);
  saveJson(outPath, manifest);
  console.log(JSON.stringify(integrity, null, 2));
}

function verifyManifestCli(flags: Record<string, string | boolean>) {
  const manifestPath = flags.manifest as string;
  const ledgerPath = flags.ledger as string;
  const publicKeyPath = flags['public-key'] as string | undefined;
  if (!manifestPath || !ledgerPath) {
    throw new Error('verify-manifest requires --manifest and --ledger');
  }

  const manifest = loadJson<ExportManifest>(manifestPath);
  const ledger = loadJson<LedgerFile>(ledgerPath);

  const options: ManifestVerificationOptions = {};
  if (publicKeyPath) {
    options.manifestPublicKey = readFileSync(publicKeyPath, 'utf8');
  }

  const result = verifyManifest(manifest, ledger, options);
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.valid ? 0 : 1;
}

function evidenceChainCli(flags: Record<string, string | boolean>) {
  const manifestPath = flags.manifest as string;
  const ledgerPath = flags.ledger as string;
  const entity = flags.entity as string;
  if (!manifestPath || !ledgerPath || !entity) {
    throw new Error('evidence-chain requires --manifest, --ledger, and --entity');
  }

  const manifest = loadJson<ExportManifest>(manifestPath);
  const ledger = loadJson<LedgerFile>(ledgerPath);
  const chains = buildEvidenceChain(entity, manifest, ledger);
  console.log(JSON.stringify(chains, null, 2));
}

function hashCli(positional: string[]) {
  if (positional.length === 0) {
    throw new Error('hash requires at least one file path');
  }
  const result: Record<string, string> = {};
  for (const path of positional) {
    result[path] = hashFile(path);
  }
  console.log(JSON.stringify(result, null, 2));
}

function manifestHashCli(flags: Record<string, string | boolean>) {
  const manifestPath = flags.manifest as string;
  if (!manifestPath) {
    throw new Error('manifest-hash requires --manifest');
  }
  const manifest = loadJson<ExportManifest>(manifestPath);
  const payloadHash = calculateManifestHash(manifest);
  const { integrity: _integrity, ...payload } = manifest;
  const canonical = canonicalString(payload);
  console.log(
    JSON.stringify(
      {
        manifestHash: payloadHash,
        canonical,
      },
      null,
      2,
    ),
  );
}

function usage() {
  console.log(`provenance-cli <command> [options]\n\nCommands:\n  hash <file...>\n  append-ledger-entry --ledger <path> --private-key <path> --key-id <id> --claim <id> --entity <id> --evidence <id> --stage <name> --hash <sha256> [--actor <name>] [--artifact-uri <uri>] [--metadata <json>]\n  verify-ledger --ledger <path>\n  sign-manifest --manifest <path> --private-key <path> --key-id <id> [--out <path>]\n  verify-manifest --manifest <path> --ledger <path> [--public-key <path>]\n  evidence-chain --manifest <path> --ledger <path> --entity <id>\n  manifest-hash --manifest <path>\n`);
}

function runCli() {
  const parsed = parseArgs(process.argv.slice(2));
  const { command, positional, flags } = parsed;

  try {
    switch (command) {
      case 'hash':
        hashCli(positional);
        break;
      case 'append-ledger-entry':
        appendFromCli(flags);
        break;
      case 'verify-ledger':
        verifyLedgerCli(flags);
        break;
      case 'sign-manifest':
        signManifestCli(flags);
        break;
      case 'verify-manifest':
        verifyManifestCli(flags);
        break;
      case 'evidence-chain':
        evidenceChainCli(flags);
        break;
      case 'manifest-hash':
        manifestHashCli(flags);
        break;
      case undefined:
        usage();
        process.exitCode = 1;
        break;
      default:
        console.error(`unknown command ${command}`);
        usage();
        process.exitCode = 1;
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error(error);
    }
    process.exitCode = 1;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  runCli();
}
