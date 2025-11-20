/**
 * Deduplication algorithms for identity records
 */

import type {
  IdentityRecord,
  DeduplicationResult
} from './types.js';
import { calculateSimilarity } from './matching.js';

/**
 * Deduplicate a list of identity records
 */
export async function deduplicateRecords(
  records: IdentityRecord[],
  threshold: number = 0.85
): Promise<DeduplicationResult> {
  const duplicateGroups: IdentityRecord[][] = [];
  const processed = new Set<string>();
  const unique: IdentityRecord[] = [];

  for (let i = 0; i < records.length; i++) {
    if (processed.has(records[i].id)) continue;

    const group: IdentityRecord[] = [records[i]];
    processed.add(records[i].id);

    for (let j = i + 1; j < records.length; j++) {
      if (processed.has(records[j].id)) continue;

      const similarity = calculateRecordSimilarity(records[i], records[j]);

      if (similarity >= threshold) {
        group.push(records[j]);
        processed.add(records[j].id);
      }
    }

    if (group.length > 1) {
      duplicateGroups.push(group);
    } else {
      unique.push(records[i]);
    }
  }

  return {
    originalCount: records.length,
    duplicateCount: records.length - unique.length - duplicateGroups.length,
    uniqueCount: unique.length + duplicateGroups.length,
    duplicateGroups,
    confidence: threshold
  };
}

/**
 * Calculate overall similarity between two records
 */
export function calculateRecordSimilarity(
  record1: IdentityRecord,
  record2: IdentityRecord
): number {
  const commonFields: string[] = [];
  let totalSimilarity = 0;

  for (const field of Object.keys(record1.attributes)) {
    if (field in record2.attributes) {
      commonFields.push(field);
    }
  }

  if (commonFields.length === 0) return 0;

  for (const field of commonFields) {
    const value1 = record1.attributes[field];
    const value2 = record2.attributes[field];
    const similarity = calculateSimilarity(value1, value2, field);
    totalSimilarity += similarity;
  }

  return totalSimilarity / commonFields.length;
}

/**
 * Find exact duplicates by key fields
 */
export function findExactDuplicates(
  records: IdentityRecord[],
  keyFields: string[]
): Map<string, IdentityRecord[]> {
  const groups = new Map<string, IdentityRecord[]>();

  for (const record of records) {
    const key = generateKey(record, keyFields);
    const group = groups.get(key) || [];
    group.push(record);
    groups.set(key, group);
  }

  // Filter to only groups with duplicates
  const duplicates = new Map<string, IdentityRecord[]>();
  for (const [key, group] of groups) {
    if (group.length > 1) {
      duplicates.set(key, group);
    }
  }

  return duplicates;
}

/**
 * Generate a composite key from record fields
 */
function generateKey(record: IdentityRecord, fields: string[]): string {
  return fields
    .map(field => String(record.attributes[field] || '').toLowerCase())
    .join('|');
}

/**
 * Merge duplicate records into a single canonical record
 */
export function mergeDuplicates(records: IdentityRecord[]): IdentityRecord {
  if (records.length === 0) {
    throw new Error('Cannot merge empty record list');
  }

  if (records.length === 1) {
    return records[0];
  }

  // Use most recent record as base
  const sorted = [...records].sort(
    (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
  );

  const merged: IdentityRecord = {
    ...sorted[0],
    attributes: {},
    metadata: {
      ...sorted[0].metadata,
      confidence: 0
    }
  };

  // Merge attributes, preferring non-null values
  const allFields = new Set<string>();
  for (const record of records) {
    for (const field of Object.keys(record.attributes)) {
      allFields.add(field);
    }
  }

  for (const field of allFields) {
    const values = records
      .map(r => r.attributes[field])
      .filter(v => v !== null && v !== undefined && v !== '');

    if (values.length > 0) {
      // Use most common value
      merged.attributes[field] = getMostCommonValue(values);
    }
  }

  // Calculate merged confidence
  const avgConfidence =
    records.reduce((sum, r) => sum + r.metadata.confidence, 0) / records.length;
  merged.metadata.confidence = avgConfidence;

  return merged;
}

/**
 * Get most common value from array
 */
function getMostCommonValue(values: any[]): any {
  const counts = new Map<any, number>();

  for (const value of values) {
    const key = JSON.stringify(value);
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  let maxCount = 0;
  let mostCommon = values[0];

  for (const [key, count] of counts) {
    if (count > maxCount) {
      maxCount = count;
      mostCommon = JSON.parse(key);
    }
  }

  return mostCommon;
}

/**
 * Calculate deduplication statistics
 */
export function calculateDeduplicationStats(
  result: DeduplicationResult
): {
  deduplicationRate: number;
  averageGroupSize: number;
  largestGroupSize: number;
} {
  const totalDuplicates = result.duplicateGroups.reduce(
    (sum, group) => sum + group.length,
    0
  );

  const averageGroupSize =
    result.duplicateGroups.length > 0
      ? totalDuplicates / result.duplicateGroups.length
      : 0;

  const largestGroupSize =
    result.duplicateGroups.length > 0
      ? Math.max(...result.duplicateGroups.map(g => g.length))
      : 0;

  return {
    deduplicationRate: result.duplicateCount / result.originalCount,
    averageGroupSize,
    largestGroupSize
  };
}
