import crypto from 'crypto';
import { CacheKeyParts, serializeCacheKey } from './key';

export interface ManifestPayload {
  key: string;
  resourceId: string;
  tenant: string;
  subjectClass: string;
  policyHash: string;
  locale: string;
  jurisdiction: string;
  createdAt: string;
  expiresAt: string;
  ttlSeconds: number;
  valueChecksum: string;
  manifestExtra?: Record<string, string>;
}

export interface Manifest extends ManifestPayload {
  signature: string;
}

const manifestFields: (keyof ManifestPayload)[] = [
  'key',
  'resourceId',
  'tenant',
  'subjectClass',
  'policyHash',
  'locale',
  'jurisdiction',
  'createdAt',
  'expiresAt',
  'ttlSeconds',
  'valueChecksum',
  'manifestExtra',
];

const canonicalisePayload = (payload: ManifestPayload): string => {
  const ordered: Record<string, unknown> = {};
  for (const field of manifestFields) {
    const value = payload[field];
    if (value === undefined) {
      continue;
    }
    if (field === 'manifestExtra' && value && Object.keys(value as Record<string, string>).length === 0) {
      continue;
    }
    ordered[field] = value;
  }
  return JSON.stringify(ordered);
};

export const buildManifestPayload = (
  keyParts: CacheKeyParts,
  options: {
    jurisdiction: string;
    createdAt: Date;
    expiresAt: Date;
    ttlSeconds: number;
    valueChecksum: string;
    manifestExtra?: Record<string, string>;
  },
): ManifestPayload => {
  return {
    key: serializeCacheKey(keyParts),
    resourceId: keyParts.resourceId,
    tenant: keyParts.tenant,
    subjectClass: keyParts.subjectClass,
    policyHash: keyParts.policyHash,
    locale: keyParts.locale,
    jurisdiction: options.jurisdiction,
    createdAt: options.createdAt.toISOString(),
    expiresAt: options.expiresAt.toISOString(),
    ttlSeconds: options.ttlSeconds,
    valueChecksum: options.valueChecksum,
    manifestExtra: options.manifestExtra,
  };
};

export const signManifestPayload = (payload: ManifestPayload, secret: string): string => {
  return crypto.createHmac('sha256', secret).update(canonicalisePayload(payload)).digest('base64');
};

export const buildManifest = (payload: ManifestPayload, secret: string): Manifest => {
  return { ...payload, signature: signManifestPayload(payload, secret) };
};

export const verifyManifest = (manifest: Manifest, secret: string): boolean => {
  const expected = Buffer.from(signManifestPayload(manifest, secret), 'base64');
  const provided = Buffer.from(manifest.signature, 'base64');
  if (expected.length !== provided.length) {
    return false;
  }
  return crypto.timingSafeEqual(expected, provided);
};

