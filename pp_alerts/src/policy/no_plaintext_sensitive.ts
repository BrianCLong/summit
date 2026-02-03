import sensitiveFields from '../../policy/sensitive_fields.json';

export interface Violation {
  path: string;
  key: string;
}

export function scanPayload(payload: any, path: string = ''): Violation[] {
  const violations: Violation[] = [];
  const sensitiveKeys = new Set(sensitiveFields.sensitive_keys);

  if (payload === null || typeof payload !== 'object') {
    return violations;
  }

  for (const key in payload) {
    if (Object.prototype.hasOwnProperty.call(payload, key)) {
      const currentPath = path ? `${path}.${key}` : key;

      if (sensitiveKeys.has(key)) {
        violations.push({ path: currentPath, key });
      }

      if (typeof payload[key] === 'object') {
        violations.push(...scanPayload(payload[key], currentPath));
      }
    }
  }

  return violations;
}

export function validate(payload: any): void {
  const violations = scanPayload(payload);
  if (violations.length > 0) {
    const details = violations.map(v => `${v.path} (matched ${v.key})`).join(', ');
    throw new Error(`Governance Violation: Plaintext sensitive fields detected: ${details}`);
  }
}
