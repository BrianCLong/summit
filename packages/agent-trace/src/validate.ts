import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { TraceRecord } from './trace_record.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const schemaPath = join(__dirname, '../schemas/agent_trace_record.schema.json');
const schema = JSON.parse(readFileSync(schemaPath, 'utf8'));

const ajv = new Ajv2020({ allErrors: true });
addFormats(ajv);
const validate = ajv.compile(schema);

export function validateTraceRecord(record: unknown): { valid: boolean; errors?: string[] } {
  const valid = validate(record);
  if (!valid) {
    return {
      valid: false,
      errors: validate.errors?.map((err) => `${err.instancePath} ${err.message}`),
    };
  }

  // Additional semantic checks
  const r = record as TraceRecord;
  const semanticErrors: string[] = [];

  for (const f of r.files) {
    for (const c of f.conversations) {
      if (c.url) {
        if (c.url.includes('?') || c.url.includes('#')) {
          semanticErrors.push(`file ${f.path}: conversation URL contains query or fragment`);
        }
      }
      for (const rg of c.ranges) {
        if (rg.start_line > rg.end_line) {
          semanticErrors.push(`file ${f.path}: start_line (${rg.start_line}) > end_line (${rg.end_line})`);
        }
      }
    }
  }

  if (semanticErrors.length > 0) {
    return { valid: false, errors: semanticErrors };
  }

  return { valid: true };
}
