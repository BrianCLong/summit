"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultExecutor = void 0;
exports.parseTransform = parseTransform;
exports.dedupeTransform = dedupeTransform;
exports.aggregateTransform = aggregateTransform;
exports.filterTransform = filterTransform;
/**
 * Parse CSV-like data
 */
async function parseTransform(data, params) {
    const delimiter = params.delimiter || ',';
    const hasHeader = params.hasHeader !== false;
    const lines = data.trim().split('\n');
    if (lines.length === 0)
        return [];
    const headers = hasHeader
        ? lines[0].split(delimiter).map((h) => h.trim())
        : Array.from({ length: lines[0].split(delimiter).length }, (_, i) => `col${i}`);
    const startIdx = hasHeader ? 1 : 0;
    return lines.slice(startIdx).map((line) => {
        const values = line.split(delimiter).map((v) => v.trim());
        const row = {};
        headers.forEach((header, idx) => {
            row[header] = values[idx];
        });
        return row;
    });
}
/**
 * Deduplicate rows by key
 */
async function dedupeTransform(data, params) {
    const key = params.key || 'id';
    const seen = new Set();
    const deduped = [];
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
async function aggregateTransform(data, params) {
    const groupBy = params.groupBy || 'category';
    const aggregateField = params.aggregateField || 'value';
    const operation = params.operation || 'sum'; // sum, count, avg, min, max
    const groups = new Map();
    for (const row of data) {
        const key = row[groupBy];
        if (!groups.has(key)) {
            groups.set(key, []);
        }
        groups.get(key).push(row);
    }
    const results = [];
    for (const [key, rows] of groups.entries()) {
        const values = rows.map((r) => parseFloat(r[aggregateField]) || 0);
        let aggregatedValue;
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
async function filterTransform(data, params) {
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
const defaultExecutor = async (transform, input) => {
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
exports.defaultExecutor = defaultExecutor;
