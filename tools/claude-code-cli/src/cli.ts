#!/usr/bin/env node
/**
 * Claude Code CLI
 *
 * Deterministic, CI-friendly CLI for Claude Code agent operations.
 * Provides schema-stable JSON output suitable for automation.
 *
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { registerRunCommand } from './commands/index.js';
import { normalizeEnvironment, getNormalizedEnv, ENV_DEFAULTS } from './utils/env.js';
import { configureOutput, buildJsonOutput, outputResult, isJsonOutput } from './utils/output.js';
import type { GlobalOptions, Diagnostic, EXIT_CODES } from './types/index.js';

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
 * ASCII banner (shown in pretty mode only)
 */
const BANNER = `
  ╔════════════════════════════════════════════════════╗
  ║                                                    ║
  ║    ██████╗██╗      █████╗ ██╗   ██╗██████╗ ███████╗║
  ║   ██╔════╝██║     ██╔══██╗██║   ██║██╔══██╗██╔════╝║
  ║   ██║     ██║     ███████║██║   ██║██║  ██║█████╗  ║
  ║   ██║     ██║     ██╔══██║██║   ██║██║  ██║██╔══╝  ║
  ║   ╚██████╗███████╗██║  ██║╚██████╔╝██████╔╝███████╗║
  ║    ╚═════╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚═════╝ ╚══════╝║
  ║                                                    ║
  ║           Claude Code CLI                          ║
  ║           Deterministic Agent Runner               ║
  ║                                                    ║
  ╚════════════════════════════════════════════════════╝
`;

/**
 * Create main CLI program
 */
function createProgram(): Command {
  const program = new Command();

  program
    .name('claude-code')
    .description('Deterministic, CI-friendly CLI for Claude Code agent operations')
    .version(getVersion(), '-V, --version', 'Output the version number')

    // Output format options
    .option('-o, --output <format>', 'Output format (pretty, json)', 'pretty')
    .option('--no-color', 'Disable colored output')
    .option('-v, --verbose', 'Enable verbose output')
    .option('-q, --quiet', 'Suppress non-essential output')
    .option('--include-timestamps', 'Include timestamps in JSON output')

    // Environment normalization options
    .option('--tz <timezone>', 'Override timezone', ENV_DEFAULTS.TZ)
    .option('--locale <locale>', 'Override locale', ENV_DEFAULTS.LOCALE)

    // Pre-action hook for global configuration
    .hook('preAction', (thisCommand, _actionCommand) => {
      const opts = thisCommand.opts() as GlobalOptions;

      // Normalize environment FIRST
      normalizeEnvironment({ tz: opts.tz, locale: opts.locale });

      // Configure output settings
      configureOutput({
        output: opts.output as 'pretty' | 'json',
        noColor: opts.noColor,
        verbose: opts.verbose,
        quiet: opts.quiet,
        includeTimestamps: opts.includeTimestamps,
      });

      // Disable colors if requested or in JSON mode
      if (opts.noColor || opts.output === 'json') {
        chalk.level = 0;
      }
    });

  // Register commands
  registerRunCommand(program);

  // Help text (only in pretty mode)
  program.addHelpText('before', (context) => {
    // Don't show banner if JSON output requested via env or early parsing
    if (process.env.CLAUDE_OUTPUT === 'json') return '';
    return chalk.cyan(BANNER);
  });

  program.addHelpText(
    'after',
    `
${chalk.bold('Examples:')}
  ${chalk.gray('# Analyze current directory (pretty output)')}
  $ claude-code run analyze

  ${chalk.gray('# Analyze with JSON output (for CI)')}
  $ claude-code --output json run analyze ./src

  ${chalk.gray('# Include timestamps in JSON output')}
  $ claude-code --output json --include-timestamps run analyze

  ${chalk.gray('# Override timezone/locale')}
  $ claude-code --tz America/New_York --locale en_US run analyze

  ${chalk.gray('# Verbose mode')}
  $ claude-code -v run analyze

${chalk.bold('Output Modes:')}
  ${chalk.cyan('pretty')}  Human-readable output with colors (default)
  ${chalk.cyan('json')}    Schema-stable JSON for CI/automation

${chalk.bold('Exit Codes:')}
  0  Success
  1  Unexpected error
  2  User error (bad input, validation failure)
  3  Provider/model error

${chalk.bold('Environment Variables:')}
  CLAUDE_OUTPUT    Default output format (pretty|json)
  TZ               Timezone (default: UTC)
  LC_ALL           Locale (default: C)

${chalk.bold('JSON Output Schema:')}
  See: https://docs.intelgraph.com/claude-code-cli/schema

${chalk.bold('More Information:')}
  Documentation: https://docs.intelgraph.com/claude-code-cli
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
  process.on('unhandledRejection', (reason) => {
    if (isJsonOutput()) {
      const diagnostics: Diagnostic[] = [
        {
          level: 'error',
          message: reason instanceof Error ? reason.message : String(reason),
          code: 'UNHANDLED_REJECTION',
        },
      ];
      const output = buildJsonOutput(
        'unknown',
        [],
        getNormalizedEnv(),
        'error',
        null,
        diagnostics
      );
      outputResult(output);
    } else {
      console.error(chalk.red('Unhandled Rejection:'), reason);
    }
    process.exit(1);
  });

  process.on('uncaughtException', (error) => {
    if (isJsonOutput()) {
      const diagnostics: Diagnostic[] = [
        {
          level: 'error',
          message: error.message,
          code: 'UNCAUGHT_EXCEPTION',
        },
      ];
      const output = buildJsonOutput(
        'unknown',
        [],
        getNormalizedEnv(),
        'error',
        null,
        diagnostics
      );
      outputResult(output);
    } else {
      console.error(chalk.red('Uncaught Exception:'), error.message);
      if (process.env.VERBOSE === 'true') {
        console.error(error.stack);
      }
    }
    process.exit(1);
  });

  // Handle SIGINT gracefully
  process.on('SIGINT', () => {
    if (!isJsonOutput()) {
      console.log();
      console.log(chalk.yellow('Operation cancelled.'));
    }
    process.exit(0);
  });

  try {
    await program.parseAsync(process.argv);
  } catch (error) {
    if (error instanceof Error) {
      if (isJsonOutput()) {
        const diagnostics: Diagnostic[] = [
          {
            level: 'error',
            message: error.message,
            code: 'CLI_ERROR',
          },
        ];
        const output = buildJsonOutput(
          'unknown',
          [],
          getNormalizedEnv(),
          'error',
          null,
          diagnostics
        );
        outputResult(output);
      } else {
        console.error(chalk.red('Error:'), error.message);
        if (process.env.VERBOSE === 'true') {
          console.error(error.stack);
        }
      }
    }
    process.exit(1);
  }
}

// Run CLI
main();

export { createProgram };
