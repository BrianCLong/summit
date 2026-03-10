#!/usr/bin/env node

import { Command } from 'commander';
import { validate } from './validate';

const program = new Command();

program
  .name('summit-bench')
  .description('CLI for Summit Benchmark Platform')
  .version('0.1.0');

program
  .command('validate')
  .description('Validate data against a benchmark schema')
  .argument('<schema>', 'Name of the schema (e.g., task.schema.json)')
  .argument('<file>', 'Path to JSON file to validate')
  .action((schema, file) => {
    try {
        const fs = require('fs');
        const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
        const result = validate(data, schema);
        if (result.valid) {
            console.log(`✅ Validation successful: ${file} matches ${schema}`);
            process.exit(0);
        } else {
            console.error(`❌ Validation failed: ${file} does not match ${schema}`);
            console.error(JSON.stringify(result.errors, null, 2));
            process.exit(1);
        }
    } catch (e: any) {
        console.error(`❌ Validation error: ${e.message}`);
        process.exit(1);
    }
  });

program.parse(process.argv);
