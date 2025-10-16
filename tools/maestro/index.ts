#!/usr/bin/env node
import { program } from 'commander';
import { readFile } from 'fs/promises';
import YAML from 'yaml';
import {
  planBackfill,
  runBackfill,
} from '../../server/src/conductor/backfill.js';

program.command('validate <file>').action(async (f) => {
  const y = await readFile(f, 'utf8');
  try {
    YAML.parse(y);
    console.log('ok');
  } catch (e: any) {
    console.error('invalid yaml', e.message);
    process.exitCode = 1;
  }
});
program.command('simulate <file>').action(async (f) => {
  const y = await readFile(f, 'utf8');
  const rb = YAML.parse(y);
  console.log(Object.keys(rb?.graph || {}));
});
program
  .command('backfill <file>')
  .option('--dry', 'dry run')
  .action(async (f, opts: any) => {
    const y = await readFile(f, 'utf8');
    if (opts.dry) console.table(await planBackfill(y));
    else console.table(await runBackfill(y, true));
  });
program.parse();
