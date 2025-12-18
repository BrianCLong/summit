export enum DataSensitivity {
  NON_SENSITIVE = 'NON_SENSITIVE',
  INTERNAL = 'INTERNAL',
  SENSITIVE_PII = 'SENSITIVE_PII',
  HIGHLY_SENSITIVE = 'HIGHLY_SENSITIVE'
}

const LEVEL_ORDER = [
  DataSensitivity.NON_SENSITIVE,
  DataSensitivity.INTERNAL,
  DataSensitivity.SENSITIVE_PII,
  DataSensitivity.HIGHLY_SENSITIVE
];

export function redactSensitive(data: any, allowedLevel: DataSensitivity): any {
  if (!data || typeof data !== 'object') return data;

  if (Array.isArray(data)) {
    return data.map(item => redactSensitive(item, allowedLevel));
  }

  const result: any = {};
  const allowedIdx = LEVEL_ORDER.indexOf(allowedLevel);

  for (const key of Object.keys(data)) {
    // Check if key implies sensitivity or if value object has a _sensitivity tag
    // For this prototype, we assume a metadata structure or convention
    // Convention: keys ending in _PII are sensitive
    // Or objects having _sensitivity property

    if (key.endsWith('_PII')) {
       if (allowedIdx < LEVEL_ORDER.indexOf(DataSensitivity.SENSITIVE_PII)) {
         result[key] = '[REDACTED]';
         continue;
       }
    }

    const value = data[key];
    if (value && typeof value === 'object' && value._sensitivity) {
       const itemLevel = value._sensitivity as DataSensitivity;
       if (LEVEL_ORDER.indexOf(itemLevel) > allowedIdx) {
         result[key] = { _redacted: true, _reason: 'Sensitivity Level' };
       } else {
         result[key] = redactSensitive(value, allowedLevel);
       }
    } else {
      result[key] = redactSensitive(value, allowedLevel);
    }
  }
  return result;
}
