#!/usr/bin/env node

import path from 'node:path';
import process from 'node:process';
import { Command } from 'commander';
import {
  evaluateChangeContracts,
  formatAjvErrors,
  listIntentFiles,
  validateIntentFile
} from './intent-validator.mjs';

const program = new Command();

program
  .name('summit-intent')
  .description('Validate Summit intent specifications')
  .version('0.1.0');

program
  .command('validate')
  .description('Validate intent spec files')
  .option('-d, --intent-dir <dir>', 'Intent spec directory', '.summit/intent')
  .option('-f, --file <file>', 'Single intent spec file')
  .option(
    '-c, --changed-files <files>',
    'Comma-separated list of changed files to evaluate change contracts'
  )
  .action((options) => {
    const intentFiles = options.file
      ? [path.resolve(options.file)]
      : listIntentFiles(path.resolve(options.intentDir));

    if (intentFiles.length === 0) {
      console.error('No intent specs found.');
      process.exitCode = 1;
      return;
    }

    const changedFiles = options.changedFiles
      ? options.changedFiles.split(',').map((file) => file.trim())
      : [];

    let hasErrors = false;

    intentFiles.forEach((filePath) => {
      const result = validateIntentFile(filePath);

      if (!result.valid) {
        hasErrors = true;
        console.error(`Intent spec invalid: ${filePath}`);
        formatAjvErrors(result.errors).forEach((error) => {
          console.error(`  - ${error}`);
        });
      }

      if (changedFiles.length > 0) {
        const findings = evaluateChangeContracts(result.data, changedFiles);
        if (findings.length > 0) {
          hasErrors = true;
          console.error(`Change contract violations for ${filePath}:`);
          findings.forEach((finding) => {
            console.error(`  - ${finding}`);
          });
        }
      }
    });

    if (hasErrors) {
      process.exitCode = 1;
      return;
    }

    console.log('Intent specs validated successfully.');
  });

program.parse(process.argv);
