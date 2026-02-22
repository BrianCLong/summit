import { schemaTags } from './tags';
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
