import { createHash } from 'crypto';

export function generateEvidenceId(prefix: string, content: string): string {
  const hash = createHash('sha256').update(content).digest('hex').substring(0, 16);
  return `EVD-REN-${prefix}-${hash.toUpperCase()}`;
}

export interface EvidenceRecord {
  id: string;
  timestamp: string; // ISO8601, stripped for deterministic artifacts
  type: string;
  data: any;
}
