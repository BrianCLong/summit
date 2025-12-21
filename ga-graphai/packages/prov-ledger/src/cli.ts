#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createExportManifest, verifyManifest } from './manifest.js';
import { SimpleProvenanceLedger } from './index.js';

export interface CliIo {
  log: (message: string) => void;
  error: (message: string) => void;
  exit: (code: number) => void;
}

const defaultIo: CliIo = {
  log: (message) => console.log(message),
  error: (message) => console.error(message),
  exit: (code) => process.exit(code),
};

function loadJson(path: string) {
  return JSON.parse(readFileSync(path, 'utf8')) as unknown;
}

export async function runCli(args: string[], io: CliIo = defaultIo): Promise<number> {
  const [command, ...rest] = args;
  try {
    switch (command) {
      case 'verify': {
        const manifestPath = rest[0];
        const ledgerPath = rest[1];
        if (!manifestPath || !ledgerPath) {
          throw new Error('Usage: verify <manifest.json> <ledger.json>');
        }
        const manifest = loadJson(manifestPath);
        const ledger = loadJson(ledgerPath);
        const result = verifyManifest(manifest, ledger);
        if (result.valid) {
          io.log('verification: pass');
          return 0;
        }
        io.error(`verification: fail -> ${result.reasons.join('; ')}`);
        return 1;
      }
      case 'inspect': {
        const manifestPath = rest[0];
        const nodeId = rest[1];
        if (!manifestPath || !nodeId) {
          throw new Error('Usage: inspect <manifest.json> <node-id>');
        }
        const manifest = loadJson(manifestPath) as { transforms: { id: string }[] };
        const node = manifest.transforms.find((entry) => entry.id === nodeId);
        if (!node) {
          io.error('not found');
          return 1;
        }
        io.log(JSON.stringify(node));
        return 0;
      }
      case 'checkpoint': {
        const ledger = new SimpleProvenanceLedger();
        const head = ledger.list().at(-1)?.hash ?? 'empty';
        io.log(`checkpoint: ${head}`);
        return 0;
      }
      case 'diff': {
        const baseline = rest[rest.indexOf('--baseline') + 1];
        const target = rest[rest.indexOf('--target') + 1];
        if (!baseline || !target) {
          throw new Error('Usage: diff --baseline <manifestA> --target <manifestB>');
        }
        const manifestA = loadJson(baseline) as { transforms: { id: string }[] };
        const manifestB = loadJson(target) as { transforms: { id: string }[] };
        const missing = manifestA.transforms.filter(
          (node) => !manifestB.transforms.some((candidate) => candidate.id === node.id),
        );
        if (missing.length === 0) {
          io.log('diff: manifests aligned');
          return 0;
        }
        io.error(`diff: missing nodes ${missing.map((node) => node.id).join(',')}`);
        return 1;
      }
      default:
        throw new Error('Unknown command');
    }
  } catch (error) {
    io.error((error as Error).message);
    io.exit(error instanceof Error && /Usage/.test(error.message) ? 2 : 1);
    return error instanceof Error && /Usage/.test(error.message) ? 2 : 1;
  }
}

const isMain = process.argv[1]
  ? fileURLToPath(import.meta.url) === process.argv[1]
  : false;

if (isMain) {
  runCli(process.argv.slice(2)).then((code) => defaultIo.exit(code));
}
