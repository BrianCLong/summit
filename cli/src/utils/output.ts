/**
 * Output Formatting Utilities
 */

import chalk from 'chalk';

export type OutputFormat = 'table' | 'json' | 'csv' | 'plain';

export interface OutputOptions {
  format?: OutputFormat;
  color?: boolean;
  quiet?: boolean;
  verbose?: boolean;
}

export function formatOutput(
  data: unknown,
  options: OutputOptions = {}
): string {
  const { format = 'plain', color = true } = options;

  switch (format) {
    case 'json':
      return JSON.stringify(data, null, 2);

    case 'csv':
      return formatCSV(data);

    case 'table':
      return formatTable(data, color);

    case 'plain':
    default:
      return formatPlain(data, color);
  }
}

export function formatTable(data: unknown, color = true): string {
  if (!Array.isArray(data) || data.length === 0) {
    return 'No data';
  }

  const rows = data as Record<string, unknown>[];
  const headers = Object.keys(rows[0]);

  // Calculate column widths
  const widths: Record<string, number> = {};
  for (const header of headers) {
    widths[header] = header.length;
    for (const row of rows) {
      const value = String(row[header] ?? '');
      widths[header] = Math.max(widths[header], value.length);
    }
  }

  // Build header row
  const headerRow = headers
    .map((h) => (color ? chalk.bold(h.padEnd(widths[h])) : h.padEnd(widths[h])))
    .join(' | ');

  // Build separator
  const separator = headers.map((h) => '-'.repeat(widths[h])).join('-+-');

  // Build data rows
  const dataRows = rows.map((row) =>
    headers.map((h) => String(row[h] ?? '').padEnd(widths[h])).join(' | ')
  );

  return [headerRow, separator, ...dataRows].join('\n');
}

export function formatCSV(data: unknown): string {
  if (!Array.isArray(data) || data.length === 0) {
    return '';
  }

  const rows = data as Record<string, unknown>[];
  const headers = Object.keys(rows[0]);

  const escapeCSV = (value: unknown): string => {
    const str = String(value ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headerLine = headers.map(escapeCSV).join(',');
  const dataLines = rows.map((row) =>
    headers.map((h) => escapeCSV(row[h])).join(',')
  );

  return [headerLine, ...dataLines].join('\n');
}

export function formatPlain(data: unknown, color = true): string {
  if (data === null || data === undefined) {
    return '';
  }

  if (typeof data === 'string') {
    return data;
  }

  if (typeof data === 'number' || typeof data === 'boolean') {
    return String(data);
  }

  if (Array.isArray(data)) {
    return data.map((item) => formatPlain(item, color)).join('\n');
  }

  if (typeof data === 'object') {
    return formatObject(data as Record<string, unknown>, color);
  }

  return String(data);
}

function formatObject(
  obj: Record<string, unknown>,
  color = true,
  indent = 0
): string {
  const lines: string[] = [];
  const prefix = '  '.repeat(indent);

  for (const [key, value] of Object.entries(obj)) {
    const formattedKey = color ? chalk.cyan(key) : key;

    if (value === null || value === undefined) {
      lines.push(`${prefix}${formattedKey}: null`);
    } else if (typeof value === 'object' && !Array.isArray(value)) {
      lines.push(`${prefix}${formattedKey}:`);
      lines.push(formatObject(value as Record<string, unknown>, color, indent + 1));
    } else if (Array.isArray(value)) {
      lines.push(`${prefix}${formattedKey}: [${value.length} items]`);
      if (value.length <= 5) {
        for (const item of value) {
          if (typeof item === 'object') {
            lines.push(formatObject(item as Record<string, unknown>, color, indent + 1));
          } else {
            lines.push(`${prefix}  - ${item}`);
          }
        }
      }
    } else {
      const formattedValue = formatValue(value, color);
      lines.push(`${prefix}${formattedKey}: ${formattedValue}`);
    }
  }

  return lines.join('\n');
}

function formatValue(value: unknown, color = true): string {
  if (typeof value === 'string') {
    return color ? chalk.green(`"${value}"`) : `"${value}"`;
  }

  if (typeof value === 'number') {
    return color ? chalk.yellow(String(value)) : String(value);
  }

  if (typeof value === 'boolean') {
    return color ? chalk.magenta(String(value)) : String(value);
  }

  return String(value);
}

export function success(message: string): void {
  console.log(chalk.green('✓'), message);
}

export function error(message: string): void {
  console.error(chalk.red('✗'), message);
}

export function warning(message: string): void {
  console.warn(chalk.yellow('⚠'), message);
}

export function info(message: string): void {
  console.log(chalk.blue('ℹ'), message);
}

export function debug(message: string): void {
  if (process.env.DEBUG) {
    console.log(chalk.gray('[debug]'), message);
  }
}

export function progress(current: number, total: number, label = ''): void {
  const percentage = Math.round((current / total) * 100);
  const barLength = 30;
  const filled = Math.round((current / total) * barLength);
  const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);

  process.stdout.write(`\r${bar} ${percentage}% ${label}`);

  if (current === total) {
    process.stdout.write('\n');
  }
}

export function spinner(message: string): {
  stop: (success?: boolean) => void;
  update: (newMessage: string) => void;
} {
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  let i = 0;
  let currentMessage = message;

  const interval = setInterval(() => {
    process.stdout.write(`\r${chalk.cyan(frames[i])} ${currentMessage}`);
    i = (i + 1) % frames.length;
  }, 80);

  return {
    stop: (success = true) => {
      clearInterval(interval);
      const icon = success ? chalk.green('✓') : chalk.red('✗');
      process.stdout.write(`\r${icon} ${currentMessage}\n`);
    },
    update: (newMessage: string) => {
      currentMessage = newMessage;
    },
  };
}
