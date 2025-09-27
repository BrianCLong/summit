import type { DataContract, NormalizedField } from '../types';
import { normalizeFields } from '../schema/normalize';

function defaultValue(field: NormalizedField): unknown {
  if (field.type.includes('int') || field.type.includes('float') || field.type.includes('double') || field.type.includes('long')) {
    return field.optional ? null : 0;
  }
  if (field.type.includes('bool')) {
    return field.optional ? null : false;
  }
  if (field.type.includes('array') || field.type.includes('repeated')) {
    return [];
  }
  return field.optional ? null : '';
}

export function buildGoldenSample(contract: DataContract): unknown[] {
  const fields = normalizeFields(contract);
  const record: Record<string, unknown> = {};
  for (const field of fields) {
    record[field.name] = defaultValue(field);
  }
  return [record];
}
