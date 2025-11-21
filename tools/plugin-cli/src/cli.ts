#!/usr/bin/env node

import { Command } from 'commander';
import { createPlugin } from './commands/create.js';
import { buildPlugin } from './commands/build.js';
import { testPlugin } from './commands/test.js';
import { publishPlugin } from './commands/publish.js';
import { validatePlugin } from './commands/validate.js';

const program = new Command();

program
  .name('summit-plugin')
  .description('CLI tool for Summit plugin development')
  .version('1.0.0');

// Create command
program
  .command('create <plugin-name>')
  .description('Create a new plugin from template')
  .option('-c, --category <category>', 'Plugin category')
  .option('-a, --author <author>', 'Plugin author name')
  .option('-t, --template <template>', 'Template to use', 'default')
  .action(createPlugin);

// Build command
program
  .command('build')
  .description('Build the plugin')
  .option('-w, --watch', 'Watch mode')
  .action(buildPlugin);

// Test command
program
  .command('test')
  .description('Run plugin tests')
  .option('-c, --coverage', 'Generate coverage report')
  .action(testPlugin);

// Validate command
program
  .command('validate')
  .description('Validate plugin manifest and code')
  .action(validatePlugin);

// Publish command
program
  .command('publish')
  .description('Publish plugin to marketplace')
  .option('-r, --registry <url>', 'Registry URL')
  .option('--dry-run', 'Dry run without publishing')
  .action(publishPlugin);

program.parse();
