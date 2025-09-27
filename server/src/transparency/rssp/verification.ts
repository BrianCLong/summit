import { createHash, verify } from 'crypto';
import { RSSPAttestation, RSSP_PUBLIC_KEY } from './attestations.js';

export interface VerificationChecklist {
  payloadHashMatches: boolean;
  exportHashMatches: boolean;
  signatureValid: boolean;
}

export interface VerificationResult {
  ok: boolean;
  checklist: VerificationChecklist;
}

const encoder = new TextEncoder();

export function stableStringify(value: unknown): string {
  if (value === null) return 'null';
  if (typeof value === 'number' || typeof value === 'boolean') {
    return JSON.stringify(value);
  }
  if (typeof value === 'string') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
      a.localeCompare(b),
    );
    return `{${entries.map(([key, val]) => `${JSON.stringify(key)}:${stableStringify(val)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function sha256Hex(buffer: Buffer | string): string {
  const data = typeof buffer === 'string' ? buffer : buffer.toString('utf-8');
  return createHash('sha256').update(data).digest('hex');
}

export function verifyAttestation(attestation: RSSPAttestation): VerificationResult {
  const payloadHash = sha256Hex(stableStringify(attestation.payload));
  const exportBuffer = Buffer.from(attestation.exportPack, 'base64');
  const exportHash = createHash('sha256').update(exportBuffer).digest('hex');
  const message = encoder.encode(`${payloadHash}:${exportHash}`);
  const signatureBuffer = Buffer.from(attestation.verification.signature, 'base64');
  const signatureValid = verify(null, message, RSSP_PUBLIC_KEY, signatureBuffer);

  const checklist: VerificationChecklist = {
    payloadHashMatches: payloadHash === attestation.payloadHash,
    exportHashMatches: exportHash === attestation.exportHash,
    signatureValid,
  };

  return {
    ok: checklist.payloadHashMatches && checklist.exportHashMatches && checklist.signatureValid,
    checklist,
  };
}

export function materializeExport(attestation: RSSPAttestation): Buffer {
  return Buffer.from(attestation.exportPack, 'base64');
}
