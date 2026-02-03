import { CanonicalEntityKind } from '../canonical/types.js';

export interface FieldMapping {
  sourceField: string;
  targetField: string;
  transform?: 'uppercase' | 'lowercase' | 'trim' | 'date';
}

export interface SchemaMapping {
  targetKind: CanonicalEntityKind;
  fields: FieldMapping[];
}

export function applyMapping(record: any, mapping: SchemaMapping): any {
  const result: any = {};

  for (const field of mapping.fields) {
    let value = record[field.sourceField];

    if (value !== undefined && value !== null) {
      if (field.transform) {
        switch (field.transform) {
          case 'uppercase':
            value = String(value).toUpperCase();
            break;
          case 'lowercase':
            value = String(value).toLowerCase();
            break;
          case 'trim':
            value = String(value).trim();
            break;
          case 'date':
             // Basic date parsing
             value = new Date(value).toISOString();
             break;
        }
      }
      result[field.targetField] = value;
    }
  }

  return result;
}
