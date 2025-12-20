import type { CustodyEvent } from './types';

type VerificationResult = {
  valid: boolean;
  message?: string;
};

function timestampToUnixNano(timestamp: string): string {
  const match = timestamp.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?Z$/);
  if (!match) {
    throw new Error(`invalid timestamp ${timestamp}`);
  }

  const [, year, month, day, hour, minute, second, fraction = ''] = match;
  const secondsSinceEpoch = BigInt(
    Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second)
    ) / 1000
  );

  const nanos = BigInt((fraction.padEnd(9, '0')).slice(0, 9));
  return (secondsSinceEpoch * 1_000_000_000n + nanos).toString();
}

async function sha256Hex(input: string): Promise<string> {
  if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.subtle) {
    const encoder = new TextEncoder();
    const digest = await globalThis.crypto.subtle.digest('SHA-256', encoder.encode(input));
    return Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  }

  const { createHash } = await import('crypto');
  return createHash('sha256').update(input).digest('hex');
}

async function computeHash(prevHash: string, event: CustodyEvent): Promise<string> {
  const unixNano = timestampToUnixNano(event.timestamp);
  const payload = `${prevHash}|${event.holdId}|${event.system}|${event.action}|${unixNano}|${event.scopeFingerprint}`;
  return sha256Hex(payload);
}

export async function verifyCustodyChain(events: CustodyEvent[]): Promise<VerificationResult> {
  if (events.length === 0) {
    return { valid: false, message: 'No custody events recorded.' };
  }

  const applyFingerprints = new Map<string, string>();
  const verifiedSystems = new Set<string>();
  let prevHash = '';

  for (const event of events) {
    const expectedHash = await computeHash(prevHash, event);
    if (expectedHash !== event.hash) {
      return {
        valid: false,
        message: `Hash mismatch at sequence ${event.sequence} for ${event.system}.`,
      };
    }

    if (event.action === 'apply') {
      applyFingerprints.set(event.system, event.scopeFingerprint);
    }

    if (event.action === 'verify') {
      const fingerprint = applyFingerprints.get(event.system);
      if (!fingerprint) {
        return {
          valid: false,
          message: `Verification encountered before apply for ${event.system}.`,
        };
      }
      if (fingerprint !== event.scopeFingerprint) {
        return {
          valid: false,
          message: `Fingerprint changed for ${event.system}.`,
        };
      }
      verifiedSystems.add(event.system);
    }

    prevHash = event.hash;
  }

  if (verifiedSystems.size === 0) {
    return { valid: false, message: 'No verification events were captured.' };
  }

  return { valid: true };
}
