#!/usr/bin/env node
/**
 * Summit Admin CLI
 * Unified Admin & SRE CLI for IntelGraph platform operations
 *
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  registerEnvCommands,
  registerTenantCommands,
  registerDataCommands,
  registerSecurityCommands,
  registerGraphCommands,
  registerConfigCommands,
} from './commands/index.js';

import {
  setOutputFormat,
  setVerbose,
  setJsonOutput,
  configureLogger,
} from './utils/index.js';

import { createAuditor, createAuditContext } from './utils/audit.js';
import { createApiClient } from './utils/api-client.js';
import { getEndpoint, getToken, getProfile } from './utils/config.js';
import type { GlobalOptions, OutputFormat } from './types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Get CLI version from package.json
 */
function getVersion(): string {
  try {
    const packageJson = readFileSync(resolve(__dirname, '../package.json'), 'utf8');
    return JSON.parse(packageJson).version;
  } catch {
    return '1.0.0';
  }
}

/**
 * ASCII banner
 */
const BANNER = `
  ╔═══════════════════════════════════════════════════╗
  ║                                                   ║
  ║   █████╗ ██████╗ ███╗   ███╗██╗███╗   ██╗        ║
  ║  ██╔══██╗██╔══██╗████╗ ████║██║████╗  ██║        ║
  ║  ███████║██║  ██║██╔████╔██║██║██╔██╗ ██║        ║
  ║  ██╔══██║██║  ██║██║╚██╔╝██║██║██║╚██╗██║        ║
  ║  ██║  ██║██████╔╝██║ ╚═╝ ██║██║██║ ╚████║        ║
  ║  ╚═╝  ╚═╝╚═════╝ ╚═╝     ╚═╝╚═╝╚═╝  ╚═══╝        ║
  ║                                                   ║
  ║           IntelGraph Admin CLI                    ║
  ║                                                   ║
  ╚═══════════════════════════════════════════════════╝
`;

/**
 * Create main CLI program
 */
function createProgram(): Command {
  const program = new Command();

  program
    .name('summit-admin')
    .description('Unified Admin & SRE CLI for IntelGraph platform operations')
    .version(getVersion(), '-V, --version', 'Output the version number')

    // Global options
    .option('-e, --endpoint <url>', 'API endpoint URL')
    .option('-t, --token <token>', 'Authentication token')
    .option('-p, --profile <name>', 'Configuration profile to use')
    .option('-f, --format <format>', 'Output format (json, table, yaml)', 'table')
    .option('-v, --verbose', 'Enable verbose output')
    .option('--no-color', 'Disable colored output')
    .option('--dry-run', 'Show what would be done without making changes')

    // Pre-action hook for global configuration
    .hook('preAction', (thisCommand, actionCommand) => {
      const opts = thisCommand.opts() as GlobalOptions;

      // Configure output format
      if (opts.format) {
        setOutputFormat(opts.format as OutputFormat);
        if (opts.format === 'json') {
          setJsonOutput(true);
        }
      }

      // Configure verbosity
      if (opts.verbose) {
        setVerbose(true);
        configureLogger({ level: 'verbose' });
      }

      // Disable colors if requested
      if (opts.noColor) {
        chalk.level = 0;
      }

      // Set profile defaults
      const profile = getProfile(opts.profile);
      if (profile) {
        if (!opts.endpoint) {
          opts.endpoint = profile.endpoint;
        }
        if (!opts.token) {
          opts.token = profile.token;
        }
        if (!opts.format && profile.defaultFormat) {
          setOutputFormat(profile.defaultFormat as OutputFormat);
        }
      }

      // Store resolved options
      (thisCommand as any)._resolvedOptions = opts;
    })

    // Post-action hook for audit logging
    .hook('postAction', async (thisCommand, actionCommand) => {
      const opts = thisCommand.opts() as GlobalOptions;

      // Skip audit for config commands
      if (actionCommand.name() === 'config') {
        return;
      }

      try {
        const apiClient = createApiClient({
          endpoint: getEndpoint(opts.profile, opts.endpoint),
          token: getToken(opts.profile, opts.token),
        });

        const auditor = createAuditor({
          enabled: true,
          apiClient,
        });

        const context = createAuditContext(
          actionCommand.name(),
          actionCommand.args,
          actionCommand.opts()
        );

        await auditor.record({
          action: `cli.${actionCommand.parent?.name() ?? 'root'}.${actionCommand.name()}`,
          ...context,
          userId: 'cli-user', // Would be extracted from token in real impl
          result: 'success',
        });
      } catch {
        // Silent failure for audit logging
      }
    });

  // Register command groups
  registerEnvCommands(program);
  registerTenantCommands(program);
  registerDataCommands(program);
  registerSecurityCommands(program);
  registerGraphCommands(program);
  registerConfigCommands(program);

  // Help command enhancement
  program.addHelpText('before', chalk.blue(BANNER));
  program.addHelpText(
    'after',
    `
${chalk.bold('Examples:')}
  ${chalk.gray('# Check environment status')}
  $ summit-admin env status

  ${chalk.gray('# List tenants')}
  $ summit-admin tenant list

  ${chalk.gray('# Create tenant (interactive)')}
  $ summit-admin tenant create --interactive

  ${chalk.gray('# Check graph health')}
  $ summit-admin graph health

  ${chalk.gray('# Run security policy checks')}
  $ summit-admin security check-policies --all

  ${chalk.gray('# Use production profile')}
  $ summit-admin --profile production env status

  ${chalk.gray('# Output as JSON')}
  $ summit-admin --format json env status

  ${chalk.gray('# Dry-run mode')}
  $ summit-admin --dry-run tenant suspend acme-corp

${chalk.bold('Environment Variables:')}
  INTELGRAPH_TOKEN    Authentication token
  SUMMIT_ADMIN_TOKEN  Alternative token variable

${chalk.bold('More Information:')}
  Documentation: https://docs.intelgraph.com/admin-cli
  Issues:        https://github.com/BrianCLong/summit/issues
`
  );

  return program;
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  const program = createProgram();

  // Global error handlers
  process.on('unhandledRejection', (reason, promise) => {
    console.error(chalk.red('Unhandled Rejection:'), reason);
    process.exit(1);
  });

  process.on('uncaughtException', (error) => {
    console.error(chalk.red('Uncaught Exception:'), error.message);
    if (process.env.VERBOSE === 'true') {
      console.error(error.stack);
    }
    process.exit(1);
  });

  // Handle SIGINT gracefully
  process.on('SIGINT', () => {
    console.log();
    console.log(chalk.yellow('Operation cancelled.'));
    process.exit(0);
  });

  try {
    await program.parseAsync(process.argv);
  } catch (error) {
    if (error instanceof Error) {
      console.error(chalk.red('Error:'), error.message);
      if (process.env.VERBOSE === 'true') {
        console.error(error.stack);
      }
    }
    process.exit(1);
  }
}

// Run CLI
main();

export { createProgram };
