import { DataQualityReport, DataRecord, QualityCheckResult } from './types.js';

interface RequiredFieldRule {
  field: string;
  message?: string;
}

interface RangeRule {
  field: string;
  min?: number;
  max?: number;
}

interface UniquenessRule {
  field: string;
}

export interface QualityRuleset {
  required?: RequiredFieldRule[];
  ranges?: RangeRule[];
  unique?: UniquenessRule[];
}

export class DataQualityChecker {
  private readonly seenValues: Map<string, Set<unknown>> = new Map();

  reset(): void {
    this.seenValues.clear();
  }

  run(record: DataRecord, rules: QualityRuleset): DataQualityReport {
    const results: QualityCheckResult[] = [];

    rules.required?.forEach((rule) => {
      const present = record[rule.field] !== undefined && record[rule.field] !== null;
      results.push({
        name: `required:${rule.field}`,
        passed: present,
        details: present ? undefined : rule.message ?? 'Missing required field',
      });
    });

    rules.ranges?.forEach((rule) => {
      const value = record[rule.field];
      const numeric = typeof value === 'number' ? value : Number(value);
      const withinRange =
        value !== undefined &&
        !Number.isNaN(numeric) &&
        (rule.min === undefined || numeric >= rule.min) &&
        (rule.max === undefined || numeric <= rule.max);
      results.push({
        name: `range:${rule.field}`,
        passed: withinRange,
        details: withinRange
          ? undefined
          : `Value ${value} outside expected range ${rule.min ?? '-inf'}-${rule.max ?? 'inf'}`,
      });
    });

    rules.unique?.forEach((rule) => {
      const value = record[rule.field];
      const seenForField = this.seenValues.get(rule.field) ?? new Set<unknown>();
      const isDuplicate = seenForField.has(value);
      seenForField.add(value);
      this.seenValues.set(rule.field, seenForField);
      results.push({
        name: `unique:${rule.field}`,
        passed: !isDuplicate,
        details: isDuplicate ? `Duplicate value detected for ${rule.field}` : undefined,
      });
    });

    return { recordId: String(record.id ?? ''), results };
  }
}
