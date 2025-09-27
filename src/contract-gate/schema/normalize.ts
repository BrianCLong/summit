import type { DataContract, NormalizedField } from '../types';

type JsonSchema = {
  properties?: Record<string, { type?: string | string[]; nullable?: boolean }>;
  required?: string[];
};

type AvroSchema = {
  fields?: Array<{
    name: string;
    type: string | string[] | { type: string; logicalType?: string } | Array<{ type: string }>;
    default?: unknown;
  }>;
};

type ParquetSchema = {
  fields?: Array<{
    name: string;
    primitiveType?: string;
    type?: string;
    repetitionType?: 'REQUIRED' | 'OPTIONAL' | 'REPEATED';
  }>;
};

function normalizeType(type: unknown): string {
  if (Array.isArray(type)) {
    return type.map(normalizeType).join('|');
  }
  if (typeof type === 'object' && type) {
    const maybeType = (type as { type?: string }).type;
    if (maybeType) {
      return normalizeType(maybeType);
    }
  }
  if (typeof type === 'string') {
    return type.toLowerCase();
  }
  return 'unknown';
}

export function normalizeFields(contract: DataContract): NormalizedField[] {
  if (contract.schemaType === 'json') {
    const schema = contract.schema as JsonSchema;
    const required = new Set(schema.required ?? []);
    return Object.entries(schema.properties ?? {}).map(([name, info]) => ({
      name,
      type: normalizeType(info.type ?? 'unknown'),
      optional: !required.has(name) && info.nullable !== false,
    }));
  }
  if (contract.schemaType === 'avro') {
    const schema = contract.schema as AvroSchema;
    return (schema.fields ?? []).map((field) => {
      const type = normalizeType(field.type);
      const optional = Array.isArray(field.type)
        ? field.type.some((t) => normalizeType(t) === 'null')
        : field.default !== undefined;
      return {
        name: field.name,
        type,
        optional,
      };
    });
  }
  if (contract.schemaType === 'parquet') {
    const schema = contract.schema as ParquetSchema;
    return (schema.fields ?? []).map((field) => ({
      name: field.name,
      type: normalizeType(field.primitiveType ?? field.type ?? 'unknown'),
      optional: field.repetitionType !== 'REQUIRED',
    }));
  }
  return [];
}
