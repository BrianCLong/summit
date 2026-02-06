import { ContextFile } from './builder.mjs';

export interface PolicyViolation {
  fileId: string;
  path: string;
  rule: string;
  match: string;
  severity: 'error' | 'warn';
}

const SECRET_PATTERNS = [
  { name: 'Generic API Key', regex: /api[_-]?key/i },
  { name: 'Private Key', regex: /-----BEGIN PRIVATE KEY-----/ },
  { name: 'AWS Key', regex: /AKIA[0-9A-Z]{16}/ },
  { name: 'Env Var Assignment', regex: /[A-Z_]+=[a-zA-Z0-9]{20,}/ } // Rough heuristic
];

const NEVER_LOG_PATTERNS = [
  { name: 'PII Marker', regex: /SSN|Social Security/i }
];

export function scanFiles(files: ContextFile[]): PolicyViolation[] {
  const violations: PolicyViolation[] = [];

  for (const file of files) {
    // Secret Scanning
    for (const pattern of SECRET_PATTERNS) {
      if (pattern.regex.test(file.content)) {
        violations.push({
          fileId: file.id,
          path: file.path,
          rule: `Secret: ${pattern.name}`,
          match: '***REDACTED***',
          severity: 'error'
        });
      }
    }

    // Never Log
    for (const pattern of NEVER_LOG_PATTERNS) {
      if (pattern.regex.test(file.content)) {
        violations.push({
          fileId: file.id,
          path: file.path,
          rule: `Never-Log: ${pattern.name}`,
          match: pattern.name,
          severity: 'error'
        });
      }
    }
  }

  return violations;
}
