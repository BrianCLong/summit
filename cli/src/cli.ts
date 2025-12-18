#!/usr/bin/env node
/**
 * IntelGraph CLI
 * Cross-platform command-line interface for graph queries, agent spins, and air-gapped exports
 */

import { Command } from 'commander';
import { loadConfig } from './lib/config.js';
import { registerGraphCommands } from './commands/graph.js';
import { registerAgentCommands } from './commands/agent.js';
import { registerExportCommands } from './commands/export.js';
import { registerSyncCommands } from './commands/sync.js';
import { registerConfigCommands } from './commands/config.js';
import { VERSION } from './lib/constants.js';
import { setupErrorHandling } from './utils/errors.js';

async function main(): Promise<void> {
  setupErrorHandling();

  const program = new Command();

  program
    .name('intelgraph')
    .description('IntelGraph CLI - Graph queries, agent spins, and air-gapped exports')
    .version(VERSION, '-v, --version', 'Display version number')
    .option('-c, --config <path>', 'Path to config file')
    .option('--profile <name>', 'Use named profile from config', 'default')
    .option('--json', 'Output results as JSON')
    .option('--quiet', 'Suppress non-essential output')
    .option('--verbose', 'Enable verbose output');

  // Load configuration
  const config = await loadConfig(program.opts().config);

  // Register command groups
  registerGraphCommands(program, config);
  registerAgentCommands(program, config);
  registerExportCommands(program, config);
  registerSyncCommands(program, config);
  registerConfigCommands(program, config);

  // Parse and execute
  await program.parseAsync(process.argv);

  // Show help if no command provided
  if (process.argv.length <= 2) {
    program.help();
  }
}

main().catch((error) => {
  console.error('Fatal error:', error.message);
  process.exit(1);
});
