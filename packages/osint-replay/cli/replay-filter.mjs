#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { Command } from 'commander';
import { filterReplayEvents, parseJsonLines, toJsonLines } from '../src/replay.js';

const program = new Command();

program
  .requiredOption('-i, --input <path>', 'Path to replay JSONL file')
  .requiredOption('-o, --output <path>', 'Path to write filtered JSONL')
  .option('--from <iso>', 'ISO-8601 start time (inclusive)')
  .option('--to <iso>', 'ISO-8601 end time (inclusive)')
  .option('--platform <name>', 'Filter by platform')
  .option('--entity <entity>', 'Filter by entity')
  .option('--language <code>', 'Filter by language code')
  .parse(process.argv);

const options = program.opts();

const inputContent = await readFile(options.input, 'utf8');
const events = parseJsonLines(inputContent);
const filtered = filterReplayEvents(events, {
  from: options.from,
  to: options.to,
  platform: options.platform,
  entity: options.entity,
  language: options.language,
});

await writeFile(options.output, toJsonLines(filtered), 'utf8');
