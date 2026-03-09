// src/ingest/schemaCompat.ts
import { getSchema, checkCompatibility } from './schemaRegistry';

export async function assertCompatible(subject: string, schemaId: string) {
  const schema = await getSchema(subject, schemaId);
  const compat = await checkCompatibility(subject, schema);
  if (!compat.ok) {
    const reason = compat.errors?.join('; ') || 'INCOMPATIBLE';
    const err: any = new Error('SCHEMA_INCOMPATIBLE: ' + reason);
    err.code = 'SCHEMA_INCOMPATIBLE';
    err.details = { subject, schemaId, reason };
    throw err;
  }
  return true;
}
