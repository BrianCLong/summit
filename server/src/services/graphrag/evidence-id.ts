import { createHash } from 'crypto';

export type EvidenceId = `EVD::${string}::${string}::${string}::${string}`;

export interface EvidenceSpan {
  start: number;
  end: number;
}

export interface EvidenceIdParts {
  source: string;
  dataset: string;
  content: string;
  span: EvidenceSpan;
}

export function canonicalizeEvidenceText(text: string): string {
  return text.normalize('NFKC').replace(/\s+/g, ' ').trim();
}

export function hashEvidenceValue(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 8);
}

export function hashEvidenceSpan(span: EvidenceSpan): string {
  if (span.start < 0 || span.end < 0) {
    throw new Error('Evidence span offsets must be non-negative.');
  }
  if (span.end < span.start) {
    throw new Error('Evidence span end must be greater than or equal to start.');
  }
  return hashEvidenceValue(`${span.start}:${span.end}`);
}

export function createEvidenceId(parts: EvidenceIdParts): EvidenceId {
  const canonicalText = canonicalizeEvidenceText(parts.content);
  const contentHash = hashEvidenceValue(canonicalText);
  const spanHash = hashEvidenceSpan(parts.span);
  return `EVD::${parts.source}::${parts.dataset}::${contentHash}::${spanHash}`;
}
