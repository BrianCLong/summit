import { createHash } from 'node:crypto';

function normalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => normalize(entry));
  }
  if (value && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>)
      .sort((a, b) => a.localeCompare(b))
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = normalize((value as Record<string, unknown>)[key]);
        return acc;
      }, {});
  }
  if (typeof value === 'number') {
    return Number(value.toFixed(6));
  }
  return value;
}

export function canonicalStringify(value: unknown): string {
  return JSON.stringify(normalize(value));
}

export function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function buildEvidFromInputs(inputManifest: unknown, dateStamp: string): { evid: string; inputManifestSha256: string } {
  const manifest = canonicalStringify(inputManifest);
  const inputManifestSha256 = sha256Hex(manifest);
  return {
    evid: `EVID-${dateStamp}-${inputManifestSha256.slice(0, 8)}`,
    inputManifestSha256,
  };
}
