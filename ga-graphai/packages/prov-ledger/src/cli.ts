#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { Command } from 'commander';
import { verifyManifest } from './manifest.js';
import { type LedgerEntry, type EvidenceBundle } from 'common-types';

const program = new Command();
program
  .name('prov-ledger-cli')
  .description('Validate provenance export manifests against ledger entries and evidence bundles')
  .requiredOption('-m, --manifest <path>', 'Path to manifest JSON file')
  .requiredOption('-l, --ledger <path>', 'Path to ledger entries JSON file')
  .option('-e, --evidence <path>', 'Path to evidence bundle JSON file')
  .action((opts) => {
    const manifest = JSON.parse(readFileSync(opts.manifest, 'utf-8'));
    const ledger = JSON.parse(readFileSync(opts.ledger, 'utf-8')) as LedgerEntry[];
    const evidence = opts.evidence
      ? (JSON.parse(readFileSync(opts.evidence, 'utf-8')) as EvidenceBundle)
      : undefined;
    const result = verifyManifest(manifest, ledger, { evidence });
    if (!result.valid) {
      console.error('Manifest verification FAILED');
      result.reasons.forEach((reason) => console.error(`- ${reason}`));
      process.exitCode = 1;
      return;
    }
    console.log('Manifest verification succeeded');
  });

program.parse(process.argv);
