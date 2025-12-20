import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { Dialect, Filter, MetricSpec } from './types';

export function canonicalizeSpec(spec: MetricSpec): string {
  return JSON.stringify(sortObject(spec), null, 2);
}

function sortObject(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortObject);
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
      a.localeCompare(b)
    );
    return entries.reduce<Record<string, unknown>>((acc, [key, val]) => {
      acc[key] = sortObject(val);
      return acc;
    }, {});
  }
  return value;
}

export function createSpecSignature(spec: MetricSpec): string {
  const canonical = canonicalizeSpec(spec);
  return crypto.createHash('sha256').update(canonical).digest('hex');
}

export function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

export function writeFileIfChanged(filePath: string, content: string): boolean {
  const normalized = content.trimEnd() + '\n';
  if (fs.existsSync(filePath)) {
    const existing = fs.readFileSync(filePath, 'utf8');
    if (existing === normalized) {
      return false;
    }
  }
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, normalized, 'utf8');
  return true;
}

export function quoteIdentifier(dialect: Dialect, identifier: string): string {
  switch (dialect) {
    case 'bigquery':
      return `\`${identifier}\``;
    case 'snowflake':
      return `"${identifier.toUpperCase()}"`;
    case 'postgres':
    default:
      return `"${identifier}"`;
  }
}

export function formatFilterValue(value: Filter['value']): string {
  if (Array.isArray(value)) {
    return `(${value.map(formatScalar).join(', ')})`;
  }
  return formatScalar(value);
}

function formatScalar(value: string | number | boolean): string {
  if (typeof value === 'number') {
    return value.toString();
  }
  if (typeof value === 'boolean') {
    return value ? 'TRUE' : 'FALSE';
  }
  return `'${value.replace(/'/g, "''")}'`;
}
