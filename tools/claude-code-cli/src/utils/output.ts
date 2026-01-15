/**
 * Output Formatting
 *
 * Handles pretty and JSON output modes with schema-stable structure.
 */

import chalk from 'chalk';
import type {
  CLIOutputSchema,
  Diagnostic,
  GlobalOptions,
  NormalizedEnv,
  ResultStatus,
} from '../types/index.js';
import { deterministicStringify } from './env.js';

/**
 * Global output configuration
 */
let outputConfig: {
  format: 'pretty' | 'json';
  noColor: boolean;
  verbose: boolean;
  includeTimestamps: boolean;
  quiet: boolean;
} = {
  format: 'pretty',
  noColor: false,
  verbose: false,
  includeTimestamps: false,
  quiet: false,
};

/**
 * Configure output settings
 */
export function configureOutput(options: Partial<GlobalOptions>): void {
  if (options.output) outputConfig.format = options.output;
  if (options.noColor !== undefined) {
    outputConfig.noColor = options.noColor;
    if (options.noColor) {
      chalk.level = 0;
    }
  }
  if (options.verbose !== undefined) outputConfig.verbose = options.verbose;
  if (options.includeTimestamps !== undefined) outputConfig.includeTimestamps = options.includeTimestamps;
  if (options.quiet !== undefined) outputConfig.quiet = options.quiet;
}

/**
 * Check if JSON output mode is enabled
 */
export function isJsonOutput(): boolean {
  return outputConfig.format === 'json';
}

/**
 * Check if quiet mode is enabled
 */
export function isQuiet(): boolean {
  return outputConfig.quiet;
}

/**
 * Check if verbose mode is enabled
 */
export function isVerbose(): boolean {
  return outputConfig.verbose;
}

/**
 * Build schema-stable JSON output
 */
export function buildJsonOutput(
  command: string,
  args: string[],
  normalizedEnv: NormalizedEnv,
  status: ResultStatus,
  result: unknown,
  diagnostics: Diagnostic[],
  startTime?: number
): CLIOutputSchema {
  const output: CLIOutputSchema = {
    version: '1.0.0',
    command,
    args,
    normalized_env: normalizedEnv,
    status,
    result,
    diagnostics,
  };

  if (outputConfig.includeTimestamps) {
    output.timestamp = new Date().toISOString();
    if (startTime) {
      output.duration_ms = Date.now() - startTime;
    }
  }

  return output;
}

/**
 * Output the final result
 */
export function outputResult(output: CLIOutputSchema): void {
  if (outputConfig.format === 'json') {
    // JSON mode: single JSON object, no ANSI, deterministic ordering
    console.log(deterministicStringify(output, 2));
  } else {
    // Pretty mode: human-readable output
    outputPretty(output);
  }
}

/**
 * Pretty-print output for humans
 */
function outputPretty(output: CLIOutputSchema): void {
  if (isQuiet() && output.status === 'success') {
    return;
  }

  // Status indicator
  const statusIcon =
    output.status === 'success'
      ? chalk.green('✓')
      : output.status === 'error'
        ? chalk.red('✗')
        : chalk.yellow('○');

  console.log(`${statusIcon} ${chalk.bold(output.command)} ${output.args.join(' ')}`);

  // Environment info (verbose only)
  if (isVerbose()) {
    console.log(chalk.gray(`  TZ: ${output.normalized_env.tz}`));
    console.log(chalk.gray(`  Locale: ${output.normalized_env.locale}`));
    console.log(chalk.gray(`  Node: ${output.normalized_env.nodeVersion}`));
  }

  // Result
  if (output.result !== undefined && output.result !== null) {
    if (typeof output.result === 'string') {
      console.log(output.result);
    } else {
      console.log(JSON.stringify(output.result, null, 2));
    }
  }

  // Diagnostics
  for (const diag of output.diagnostics) {
    const prefix =
      diag.level === 'error'
        ? chalk.red('ERROR')
        : diag.level === 'warning'
          ? chalk.yellow('WARN')
          : chalk.blue('INFO');
    const location = diag.file ? ` ${diag.file}${diag.line ? `:${diag.line}` : ''}` : '';
    console.log(`${prefix}${location}: ${diag.message}`);
  }

  // Timing (if enabled)
  if (output.duration_ms !== undefined) {
    console.log(chalk.gray(`  Duration: ${output.duration_ms}ms`));
  }
}

/**
 * Log message (respects quiet mode and format)
 */
export function log(message: string, level: 'info' | 'verbose' = 'info'): void {
  if (isJsonOutput()) return; // JSON mode suppresses logs
  if (isQuiet()) return;
  if (level === 'verbose' && !isVerbose()) return;

  console.log(message);
}

/**
 * Log error (always shown except in JSON mode)
 */
export function logError(message: string): void {
  if (isJsonOutput()) return;
  console.error(chalk.red(message));
}
