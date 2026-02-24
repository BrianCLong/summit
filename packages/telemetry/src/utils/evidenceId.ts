import { randomUUID } from 'crypto';

export type EvidenceDomain = 'INCIDENT' | 'SUPPLYCHAIN' | 'ASSURANCE';
export type EvidenceObjectType = 'RUN' | 'MODEL' | 'AGENT' | 'POLICY' | 'REPORT';

export function generateEvidenceId(
  domain: EvidenceDomain,
  objectType: EvidenceObjectType,
  objectId: string,
  sequence: number = 1
): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const seqStr = sequence.toString().padStart(3, '0');
  return `EVID::${domain}::${objectType}::${objectId}::${date}::${seqStr}`;
}

export function parseEvidenceId(evidenceId: string) {
  const parts = evidenceId.split('::');
  if (parts.length !== 6 || parts[0] !== 'EVID') {
    throw new Error('Invalid Evidence ID format');
  }
  return {
    domain: parts[1] as EvidenceDomain,
    objectType: parts[2] as EvidenceObjectType,
    objectId: parts[3],
    date: parts[4],
    sequence: parseInt(parts[5], 10),
  };
}
