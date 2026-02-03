import { ReviewFinding } from './types';

// High confidence secret patterns
const SECRET_PATTERNS = [
  { id: 'aws-access-key', regex: /AKIA[0-9A-Z]{16}/, name: 'AWS Access Key' },
  { id: 'aws-secret-key', regex: /(aws|s3|ses)?_?secret_?key.*?["']?[a-zA-Z0-9/+]{40}["']?/, name: 'AWS Secret Key' },
  { id: 'private-key', regex: /-----BEGIN PRIVATE KEY-----/, name: 'Private Key' },
  { id: 'github-token', regex: /gh[pous]_[a-zA-Z0-9]{36,}/, name: 'GitHub Token' },
  { id: 'slack-token', regex: /xox[baprs]-([0-9a-zA-Z]{10,48})?/, name: 'Slack Token' },
  { id: 'generic-api-key', regex: /api_key\s*[:=]\s*['"][a-zA-Z0-9]{32,}['"]/, name: 'Generic API Key' },
];

export function scanForSecrets(content: string, file: string, line?: number): ReviewFinding | null {
  for (const pattern of SECRET_PATTERNS) {
    if (pattern.regex.test(content)) {
      return {
        type: 'secret',
        severity: 'critical',
        file,
        line,
        message: `Potential ${pattern.name} detected.`,
        ruleId: `secret-${pattern.id}`,
      };
    }
  }
  return null;
}
