#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { yamlToIR } from './index';

function run(): void {
  const file = process.argv[2];
  if (!file) {
    console.error('Usage: chronos-intent <workflow.yaml>');
    process.exitCode = 1;
    return;
  }

  const resolved = path.resolve(process.cwd(), file);
  const yamlText = fs.readFileSync(resolved, 'utf8');
  const ir = yamlToIR(yamlText);
  process.stdout.write(`${JSON.stringify(ir, null, 2)}\n`);
}

run();
