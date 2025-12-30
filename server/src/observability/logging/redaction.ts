export const SENSITIVE_KEYS = [
  'password',
  'token',
  'authorization',
  'secret',
  'key',
  'credential',
  'ssn',
  'credit_card',
  'cc',
  'cvv',
];

export const MASK = '***REDACTED***';

export function redact(obj: any): any {
  if (obj === null || obj === undefined) {return obj;}

  if (Array.isArray(obj)) {
    return obj.map(redact);
  }

  if (typeof obj === 'object') {
    const newObj: Record<string, any> = {};
    for (const key of Object.keys(obj)) {
      if (SENSITIVE_KEYS.some((sensitive) => key.toLowerCase().includes(sensitive))) {
        newObj[key] = MASK;
      } else {
        newObj[key] = redact(obj[key]);
      }
    }
    return newObj;
  }

  return obj;
}
