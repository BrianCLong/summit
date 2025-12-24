#!/usr/bin/env node
/* eslint-disable @typescript-eslint/ban-ts-comment, no-console */
// @ts-nocheck
import { Command } from 'commander';
import { ProvLedgerClient } from '../index.js';
import fs from 'fs';

const program = new Command();

program
  .name('ig-prov')
  .description('IntelGraph Provenance CLI')
  .version('2.0.0');

program.command('export')
  .description('Export provenance bundle for a case')
  .requiredOption('--case <id>', 'Case ID')
  .option('--url <url>', 'Service URL', 'http://localhost:4010')
  .option('--out <file>', 'Output file', 'bundle.json')
  .action(async (options) => {
    try {
      const client = new ProvLedgerClient(options.url);
      console.log(`Exporting case ${options.case}...`);
      const bundle = await client.exportBundle(options.case);
      fs.writeFileSync(options.out, JSON.stringify(bundle, null, 2));
      console.log(`Exported to ${options.out}`);
    } catch (err: any) {
      console.error('Error exporting bundle:', err.message);
      process.exit(1);
    }
  });

program.parse();
