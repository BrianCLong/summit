import { DataRecord, TransformationContext, TransformationStep } from './types.js';

export class TransformationPipeline {
  private readonly steps: TransformationStep[] = [];

  register(step: TransformationStep): void {
    this.steps.push(step);
  }

  apply(record: DataRecord, context: TransformationContext): DataRecord {
    return this.steps.reduce((current, step) => step(current, context), record);
  }

  snapshot(): TransformationStep[] {
    return [...this.steps];
  }
}

export const normalizeKeys = (record: DataRecord): DataRecord => {
  const normalized: DataRecord = {};
  Object.entries(record).forEach(([key, value]) => {
    normalized[key.replace(/\s+/g, '_').toLowerCase()] = value;
  });
  return normalized;
};

export const coerceTypes = (
  record: DataRecord,
  typeHints: Record<string, 'number' | 'string' | 'boolean'>
): DataRecord => {
  const coerced: DataRecord = { ...record };
  Object.entries(typeHints).forEach(([field, targetType]) => {
    const value = record[field];
    if (value === undefined || value === null) {
      return;
    }
    if (targetType === 'number') {
      const asNumber = Number(value);
      if (!Number.isNaN(asNumber)) {
        coerced[field] = asNumber;
      }
    } else if (targetType === 'boolean') {
      if (typeof value === 'boolean') {
        coerced[field] = value;
      } else if (typeof value === 'string') {
        coerced[field] = value.toLowerCase() === 'true';
      }
    } else {
      coerced[field] = String(value);
    }
  });
  return coerced;
};
