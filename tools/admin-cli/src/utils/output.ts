/**
 * Output formatting utilities for Admin CLI
 * Supports JSON (machine-parseable) and human-readable formats
 */

import chalk from 'chalk';
import { table, getBorderCharacters } from 'table';
import type { OutputFormat, HealthStatus } from '../types/index.js';

/**
 * Global output format setting
 */
let globalFormat: OutputFormat = 'table';

/**
 * Set global output format
 */
export function setOutputFormat(format: OutputFormat): void {
  globalFormat = format;
}

/**
 * Get current output format
 */
export function getOutputFormat(): OutputFormat {
  return globalFormat;
}

/**
 * Format and print data based on output format
 */
export function output<T>(data: T, options?: OutputOptions<T>): void {
  const format = options?.format ?? globalFormat;

  switch (format) {
    case 'json':
      outputJson(data);
      break;
    case 'yaml':
      outputYaml(data);
      break;
    case 'table':
    default:
      if (options?.tableFormatter) {
        options.tableFormatter(data);
      } else if (Array.isArray(data)) {
        outputTable(data, options?.columns);
      } else {
        outputKeyValue(data as Record<string, unknown>);
      }
  }
}

interface OutputOptions<T> {
  format?: OutputFormat;
  columns?: string[];
  tableFormatter?: (data: T) => void;
}

/**
 * Output data as JSON
 */
export function outputJson<T>(data: T): void {
  console.log(JSON.stringify(data, null, 2));
}

/**
 * Output data as YAML-like format
 */
export function outputYaml<T>(data: T): void {
  const yaml = toYaml(data, 0);
  console.log(yaml);
}

function toYaml(data: unknown, indent: number): string {
  const prefix = '  '.repeat(indent);

  if (data === null || data === undefined) {
    return 'null';
  }

  if (typeof data === 'string') {
    if (data.includes('\n')) {
      return `|\n${data
        .split('\n')
        .map((line) => `${prefix}  ${line}`)
        .join('\n')}`;
    }
    return data;
  }

  if (typeof data === 'number' || typeof data === 'boolean') {
    return String(data);
  }

  if (Array.isArray(data)) {
    if (data.length === 0) return '[]';
    return data.map((item) => `${prefix}- ${toYaml(item, indent + 1)}`).join('\n');
  }

  if (typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    const keys = Object.keys(obj);
    if (keys.length === 0) return '{}';
    return keys
      .map((key) => {
        const value = obj[key];
        if (typeof value === 'object' && value !== null) {
          return `${prefix}${key}:\n${toYaml(value, indent + 1)}`;
        }
        return `${prefix}${key}: ${toYaml(value, indent)}`;
      })
      .join('\n');
  }

  return String(data);
}

/**
 * Output array data as table
 */
export function outputTable<T extends Record<string, unknown>>(
  data: T[],
  columns?: string[]
): void {
  if (data.length === 0) {
    console.log(chalk.gray('No data to display'));
    return;
  }

  const cols = columns ?? Object.keys(data[0]);
  const headers = cols.map((c) => chalk.bold(formatHeader(c)));
  const rows = data.map((item) => cols.map((c) => formatCell(item[c])));

  const tableData = [headers, ...rows];

  console.log(
    table(tableData, {
      border: getBorderCharacters('norc'),
      columnDefault: {
        paddingLeft: 1,
        paddingRight: 1,
      },
    })
  );
}

/**
 * Output key-value pairs
 */
export function outputKeyValue(data: Record<string, unknown>, indent = 0): void {
  const prefix = '  '.repeat(indent);

  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      console.log(`${prefix}${chalk.bold(formatHeader(key))}:`);
      outputKeyValue(value as Record<string, unknown>, indent + 1);
    } else {
      console.log(`${prefix}${chalk.bold(formatHeader(key))}: ${formatCell(value)}`);
    }
  }
}

/**
 * Format header text (camelCase to Title Case)
 */
function formatHeader(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

/**
 * Format cell value for display
 */
function formatCell(value: unknown): string {
  if (value === null || value === undefined) {
    return chalk.gray('-');
  }

  if (typeof value === 'boolean') {
    return value ? chalk.green('✓') : chalk.red('✗');
  }

  if (typeof value === 'number') {
    return chalk.cyan(String(value));
  }

  if (Array.isArray(value)) {
    return value.join(', ');
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
}

/**
 * Format health status with color
 */
export function formatHealthStatus(status: HealthStatus): string {
  switch (status) {
    case 'healthy':
      return chalk.green('● healthy');
    case 'degraded':
      return chalk.yellow('◐ degraded');
    case 'unhealthy':
      return chalk.red('○ unhealthy');
    default:
      return chalk.gray('? unknown');
  }
}

/**
 * Format percentage
 */
export function formatPercentage(value: number): string {
  const formatted = (value * 100).toFixed(2) + '%';
  if (value >= 0.99) return chalk.green(formatted);
  if (value >= 0.95) return chalk.yellow(formatted);
  return chalk.red(formatted);
}

/**
 * Format duration in milliseconds
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(2)}m`;
  return `${(ms / 3600000).toFixed(2)}h`;
}

/**
 * Format byte size
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Format timestamp
 */
export function formatTimestamp(ts: string | Date): string {
  const date = typeof ts === 'string' ? new Date(ts) : ts;
  return date.toLocaleString();
}

/**
 * Print section header
 */
export function printHeader(title: string): void {
  if (globalFormat === 'json') return;
  console.log();
  console.log(chalk.bold.blue(`═══ ${title} ═══`));
  console.log();
}

/**
 * Print success message
 */
export function printSuccess(message: string): void {
  if (globalFormat === 'json') return;
  console.log(chalk.green('✓'), message);
}

/**
 * Print warning message
 */
export function printWarning(message: string): void {
  if (globalFormat === 'json') return;
  console.log(chalk.yellow('⚠'), message);
}

/**
 * Print error message
 */
export function printError(message: string): void {
  if (globalFormat === 'json') {
    console.error(JSON.stringify({ error: message }));
    return;
  }
  console.error(chalk.red('✗'), message);
}

/**
 * Print info message
 */
export function printInfo(message: string): void {
  if (globalFormat === 'json') return;
  console.log(chalk.blue('ℹ'), message);
}

/**
 * Print dry-run banner
 */
export function printDryRunBanner(): void {
  if (globalFormat === 'json') return;
  console.log();
  console.log(chalk.bgYellow.black(' DRY RUN '), chalk.yellow('No changes will be made'));
  console.log();
}
