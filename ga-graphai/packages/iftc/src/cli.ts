#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { analyzeAnnotatedFiles, parseAnnotatedFile } from './index.js';

function printUsage(): void {
  console.log('Usage: iftc <file> [file ...]');
  console.log('Each file must contain @label, @flow, @transform directives in comments.');
}

function renderDiagnostic(index: number, total: number, message: string): string {
  return `\n[${index + 1}/${total}] ${message}`;
}

function renderTrace(trace: string[]): string {
  return trace.map((step) => `  ↳ ${step}`).join('\n');
}

async function main(): Promise<void> {
  const inputs = process.argv.slice(2);
  if (inputs.length === 0) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  const files = inputs.map((input) => {
    const filePath = path.resolve(process.cwd(), input);
    const content = fs.readFileSync(filePath, 'utf8');
    return parseAnnotatedFile(filePath, content);
  });

  const result = analyzeAnnotatedFiles(files);
  if (result.errors.length === 0) {
    console.log(`✓ iftc passed (${result.flows.length} flows checked)`);
    return;
  }

  console.error(`✗ iftc blocked ${result.errors.length} unsafe flow(s)`);
  result.errors.forEach((error, index) => {
    console.error(renderDiagnostic(index, result.errors.length, error.message));
    console.error(renderTrace(error.trace));
    console.error(`  suggestion: ${error.suggestion}`);
  });
  process.exitCode = 1;
}

main().catch((error) => {
  console.error('iftc failed with an unexpected error:', error);
  process.exit(1);
});
