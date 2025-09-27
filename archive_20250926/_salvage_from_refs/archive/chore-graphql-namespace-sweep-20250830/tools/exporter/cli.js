#!/usr/bin/env node
import { program } from 'commander';
import { render } from './renderer.js';
import fs from 'fs';
import path from 'path';

program
  .argument('<url>')
  .argument('<out>')
  .option('--landscape', 'Landscape orientation', false)
  .option('--format <fmt>', 'Paper format', 'A4')
  .option('--header <path>', 'Header HTML template')
  .option('--footer <path>', 'Footer HTML template')
  .parse();

const [url, out] = program.args;
const o = program.opts();

if (!url || !out) {
  console.error('Usage: exporter [--landscape] [--format=A4|Letter] [--header <file>] [--footer <file>] <url> <out.(pdf|png)>');
  process.exit(1);
}

fs.mkdirSync(path.dirname(out), { recursive: true });

await render({
  url,
  out,
  landscape: !!o.landscape,
  format: o.format,
  headerPath: o.header,
  footerPath: o.footer,
});

console.log('OK');
