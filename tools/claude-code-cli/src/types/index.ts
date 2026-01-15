/**
 * Claude Code CLI Types
 *
 * Defines the schema-stable types for deterministic CLI output.
 */

/**
 * Output format modes
 */
export type OutputFormat = 'pretty' | 'json';

/**
 * Global CLI options
 */
export interface GlobalOptions {
  output: OutputFormat;
  tz: string;
  locale: string;
  noColor: boolean;
  verbose: boolean;
  includeTimestamps: boolean;
  quiet: boolean;
}

/**
 * Normalized environment info included in JSON output
 */
export interface NormalizedEnv {
  tz: string;
  locale: string;
  nodeVersion: string;
  platform: string;
  arch: string;
}

/**
 * CLI result status
 */
export type ResultStatus = 'success' | 'error' | 'cancelled';

/**
 * Diagnostic entry for errors/warnings
 */
export interface Diagnostic {
  level: 'error' | 'warning' | 'info';
  message: string;
  code?: string;
  file?: string;
  line?: number;
}

/**
 * Schema-stable JSON output structure
 * This schema is versioned and documented for CI consumers.
 */
export interface CLIOutputSchema {
  /** Schema version for forward compatibility */
  version: '1.0.0';

  /** Command that was executed */
  command: string;

  /** Arguments passed to the command */
  args: string[];

  /** Normalized environment at execution time */
  normalized_env: NormalizedEnv;

  /** Execution status */
  status: ResultStatus;

  /** Command-specific result data */
  result: unknown;

  /** Diagnostics (errors, warnings, info) */
  diagnostics: Diagnostic[];

  /** ISO timestamp (only if --include-timestamps) */
  timestamp?: string;

  /** Execution duration in milliseconds (only if --include-timestamps) */
  duration_ms?: number;
}

/**
 * Exit codes for the CLI
 * Documented and stable for CI integration.
 */
export const EXIT_CODES = {
  SUCCESS: 0,
  UNEXPECTED_ERROR: 1,
  USER_ERROR: 2,
  PROVIDER_ERROR: 3,
} as const;

export type ExitCode = (typeof EXIT_CODES)[keyof typeof EXIT_CODES];
