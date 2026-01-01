import { createHash, createHmac } from 'crypto';

// ============================================================================
// SECURITY: Credential Validation
// ============================================================================

function requireSecret(name: string, value: string | undefined, minLength: number = 32): string {
  if (!value) {
    console.error(`FATAL: ${name} environment variable is required but not set`);
    console.error(`Set ${name} in your environment or .env file`);
    process.exit(1);
  }

  if (value.length < minLength) {
    console.error(`FATAL: ${name} must be at least ${minLength} characters`);
    console.error(`Current length: ${value.length}`);
    process.exit(1);
  }

  const insecureValues = ['password', 'secret', 'changeme', 'default', 'dev-secret'];
  if (insecureValues.some(v => value.toLowerCase().includes(v))) {
    console.error(`FATAL: ${name} is set to an insecure default value`);
    console.error(`Use a strong, unique secret (e.g., generated via: openssl rand -base64 32)`);
    process.exit(1);
  }

  return value;
}

export interface ProvenanceRecord {
  inputHash: string;
  algorithm: string;
  version: string;
  timestamp: string;
  signature: string;
}

const SECRET = requireSecret('PROVENANCE_SECRET', process.env.PROVENANCE_SECRET, 32);

export function createProvenanceRecord(
  data: Buffer | string,
  algorithm = 'SHA-256',
  version = '1',
  timestamp = new Date().toISOString(),
): ProvenanceRecord {
  const hash = createHash('sha256').update(data).digest('hex');
  const signature = createHmac('sha256', SECRET)
    .update(`${hash}|${algorithm}|${version}|${timestamp}`)
    .digest('hex');
  return { inputHash: hash, algorithm, version, timestamp, signature };
}
