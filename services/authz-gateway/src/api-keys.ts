import crypto from 'crypto';

export interface ApiClient {
  keyId: string;
  clientId: string;
  tenantId: string;
  subjectHint?: string;
}

interface ApiKeyRecord extends ApiClient {
  hashedKey: string;
  revoked?: boolean;
}

function hashKey(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

const apiKeys: ApiKeyRecord[] = [
  {
    keyId: 'demo-governance',
    clientId: 'governance-sample-client',
    tenantId: 'tenantA',
    subjectHint: 'alice',
    hashedKey: hashKey('demo-external-key-123'),
  },
];

export function lookupApiClient(apiKey: string): ApiClient | null {
  const hashed = hashKey(apiKey);
  const record = apiKeys.find((entry) => entry.hashedKey === hashed);
  if (!record || record.revoked) {
    return null;
  }
  const { hashedKey: _hashedKey, ...client } = record;
  return client;
}

// Ensure we export a string to maintain type compatibility, defaulting to empty string in non-prod if missing.
// In production, the runtime check below ensures we crash if it's missing.
export const TEST_API_KEY: string = process.env.TEST_API_KEY || '';

if (!process.env.TEST_API_KEY && process.env.NODE_ENV === 'production') {
   throw new Error('TEST_API_KEY environment variable is not set');
}
