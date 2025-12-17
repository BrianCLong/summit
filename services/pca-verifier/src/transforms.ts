import type { Transform } from './types.js';

/**
 * Sample transform implementations for PCA demo
 */

export interface TransformExecutor {
  (transform: Transform, input: any): Promise<any>;
}

/**
 * Parse CSV-like data
 */
export async function parseTransform(data: string, params: Record<string, any>): Promise<any[]> {
  const delimiter = params.delimiter || ',';
  const hasHeader = params.hasHeader !== false;

  const lines = data.trim().split('\n');
  if (lines.length === 0) return [];

  const headers = hasHeader
    ? lines[0].split(delimiter).map((h) => h.trim())
    : Array.from({ length: lines[0].split(delimiter).length }, (_, i) => `col${i}`);

  const startIdx = hasHeader ? 1 : 0;
  return lines.slice(startIdx).map((line) => {
    const values = line.split(delimiter).map((v) => v.trim());
    const row: Record<string, any> = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx];
    });
    return row;
  });
}

/**
 * Deduplicate rows by key
 */
export async function dedupeTransform(data: any[], params: Record<string, any>): Promise<any[]> {
  const key = params.key || 'id';
  const seen = new Set<string>();
  const deduped: any[] = [];

  for (const row of data) {
    const keyValue = row[key];
    if (!seen.has(keyValue)) {
      seen.add(keyValue);
      deduped.push(row);
    }
  }

  return deduped;
}

/**
 * Aggregate rows by groupKey
 */
export async function aggregateTransform(data: any[], params: Record<string, any>): Promise<any[]> {
  const groupBy = params.groupBy || 'category';
  const aggregateField = params.aggregateField || 'value';
  const operation = params.operation || 'sum'; // sum, count, avg, min, max

  const groups = new Map<string, any[]>();

  for (const row of data) {
    const key = row[groupBy];
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(row);
  }

  const results: any[] = [];
  for (const [key, rows] of groups.entries()) {
    const values = rows.map((r) => parseFloat(r[aggregateField]) || 0);

    let aggregatedValue: number;
    switch (operation) {
      case 'sum':
        aggregatedValue = values.reduce((a, b) => a + b, 0);
        break;
      case 'count':
        aggregatedValue = values.length;
        break;
      case 'avg':
        aggregatedValue = values.reduce((a, b) => a + b, 0) / values.length;
        break;
      case 'min':
        aggregatedValue = Math.min(...values);
        break;
      case 'max':
        aggregatedValue = Math.max(...values);
        break;
      default:
        aggregatedValue = values.reduce((a, b) => a + b, 0);
    }

    results.push({
      [groupBy]: key,
      [aggregateField]: aggregatedValue,
      count: rows.length,
    });
  }

  return results;
}

/**
 * Filter rows by predicate
 */
export async function filterTransform(data: any[], params: Record<string, any>): Promise<any[]> {
  const field = params.field;
  const operator = params.operator || 'eq'; // eq, ne, gt, lt, gte, lte, contains
  const value = params.value;

  return data.filter((row) => {
    const fieldValue = row[field];

    switch (operator) {
      case 'eq':
        return fieldValue == value;
      case 'ne':
        return fieldValue != value;
      case 'gt':
        return parseFloat(fieldValue) > parseFloat(value);
      case 'lt':
        return parseFloat(fieldValue) < parseFloat(value);
      case 'gte':
        return parseFloat(fieldValue) >= parseFloat(value);
      case 'lte':
        return parseFloat(fieldValue) <= parseFloat(value);
      case 'contains':
        return String(fieldValue).includes(String(value));
      default:
        return true;
    }
  });
}

/**
 * Generic transform executor
 */
export const defaultExecutor: TransformExecutor = async (transform, input) => {
  switch (transform.type) {
    case 'parse':
      return parseTransform(input, transform.params);
    case 'dedupe':
      return dedupeTransform(input, transform.params);
    case 'aggregate':
      return aggregateTransform(input, transform.params);
    case 'filter':
      return filterTransform(input, transform.params);
    default:
      throw new Error(`Unknown transform type: ${transform.type}`);
  }
};
