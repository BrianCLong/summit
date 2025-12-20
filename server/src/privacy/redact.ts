import { schemaTags } from './tags';

/**
 * Recursively redacts Personally Identifiable Information (PII) and sensitive data from an object.
 * It uses a schema tag mapping to identify fields that should be redacted.
 *
 * @param obj - The object to redact. Can be of any type, but only objects are traversed.
 * @returns The redacted object.
 */
export function redact(obj: any) {
  if (obj && typeof obj === 'object') {
    for (const k of Object.keys(obj)) {
      const tag = schemaTags[`${obj.__table || ''}.${k}`];
      if (tag === 'PII' || tag === 'SENSITIVE') obj[k] = '***';
      else redact(obj[k]);
    }
  }
  return obj;
}
