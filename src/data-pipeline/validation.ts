import Ajv, { DefinedError } from 'ajv';
import addFormats from 'ajv-formats';
import { DataRecord, DeadLetterEntry, ValidationErrorDetail } from './types.js';

export class SchemaValidator {
  private readonly ajv: Ajv;
  private readonly validateFn: Ajv.ValidateFunction;

  constructor(schema: Record<string, unknown>) {
    this.ajv = new Ajv({ allErrors: true, removeAdditional: 'failing' });
    addFormats(this.ajv);
    this.validateFn = this.ajv.compile(schema);
  }

  validate(record: DataRecord): { valid: boolean; errors: ValidationErrorDetail[] } {
    const valid = this.validateFn(record) as boolean;
    if (valid) {
      return { valid: true, errors: [] };
    }

    const errors: ValidationErrorDetail[] = (this.validateFn.errors ?? []).map(
      (error) => ({
        field: error.instancePath || error.schemaPath || 'unknown',
        message: (error as DefinedError).message ?? 'Validation failed',
      })
    );

    return { valid: false, errors };
  }
}

export class DeadLetterQueue {
  private readonly entries: DeadLetterEntry[] = [];

  push(entry: DeadLetterEntry): void {
    this.entries.push(entry);
  }

  drain(): DeadLetterEntry[] {
    const snapshot = [...this.entries];
    this.entries.length = 0;
    return snapshot;
  }

  size(): number {
    return this.entries.length;
  }
}

export class RecordCleaner {
  clean(record: DataRecord): DataRecord {
    const cleaned: DataRecord = {};
    Object.entries(record).forEach(([key, value]) => {
      if (value === undefined) {
        return;
      }
      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed.length === 0) {
          return;
        }
        cleaned[key] = trimmed;
        return;
      }
      if (value !== null) {
        cleaned[key] = value;
      }
    });
    return cleaned;
  }
}
