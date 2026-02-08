import { createHash } from 'node:crypto';

export const ITEM_SLUG = 'NARRATIVE-CI';

export function buildEvidenceId(area: string, sequence: string): string {
  return `EVD-${ITEM_SLUG}-${area}-${sequence}`;
}

export function stableHash(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}
