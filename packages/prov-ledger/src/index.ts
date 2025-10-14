import {
  createHash,
  createPrivateKey,
  createPublicKey,
  KeyObject,
  sign,
  verify,
} from 'crypto';

export type ProvenanceStepType =
  | 'ingest'
  | 'transform'
  | 'policy-check'
  | 'export';

export interface ProvenanceStep {
  id: string;
  type: ProvenanceStepType;
  tool: string;
  params: Record<string, unknown>;
  inputHash: string;
  outputHash: string;
  timestamp: string;
  note?: string;
}

export interface ProvenanceManifest {
  artifactId: string;
  steps: ProvenanceStep[];
}

export function hashContent(data: string | Buffer): string {
  return createHash('sha256').update(data).digest('hex');
}

export function hashJson(obj: unknown): string {
  return hashContent(JSON.stringify(obj));
}

export interface RecordStepOptions {
  id: string;
  type: ProvenanceStepType;
  tool: string;
  params: Record<string, unknown>;
  input: string | Buffer;
  output: string | Buffer;
  timestamp?: string;
  note?: string;
}

export function recordStep(manifest: ProvenanceManifest, opts: RecordStepOptions): ProvenanceStep {
  const step: ProvenanceStep = {
    id: opts.id,
    type: opts.type,
    tool: opts.tool,
    params: opts.params,
    inputHash: hashContent(opts.input),
    outputHash: hashContent(opts.output),
    timestamp: opts.timestamp ?? new Date().toISOString(),
    note: opts.note,
  };
  manifest.steps.push(step);
  return step;
}

export interface ManifestSignature {
  algorithm: 'ed25519';
  signature: string;
  keyId?: string;
}

function canonicaliseManifest(manifest: ProvenanceManifest): Buffer {
  const enrichStep = (step: ProvenanceStep) => ({
    id: step.id,
    inputHash: step.inputHash,
    note: step.note,
    outputHash: step.outputHash,
    params: step.params,
    timestamp: step.timestamp,
    tool: step.tool,
    type: step.type,
  });

  const sorted = sortKeys({
    artifactId: manifest.artifactId,
    steps: manifest.steps.map(enrichStep),
  });

  return Buffer.from(JSON.stringify(sorted));
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sortKeys(item));
  }
  if (value && typeof value === 'object') {
    const sortedEntries = Object.entries(value)
      .filter(([, v]) => v !== undefined)
      .map(([key, val]) => [key, sortKeys(val)] as const)
      .sort(([a], [b]) => (a > b ? 1 : a < b ? -1 : 0));
    return sortedEntries.reduce<Record<string, unknown>>((acc, [key, val]) => {
      acc[key] = val;
      return acc;
    }, {});
  }
  return value;
}

export function signManifest(
  manifest: ProvenanceManifest,
  privateKey: string | Buffer | KeyObject,
  keyId?: string,
): ManifestSignature {
  const key =
    typeof privateKey === 'string' || Buffer.isBuffer(privateKey)
      ? createPrivateKey(privateKey)
      : privateKey;
  const signature = sign(null, canonicaliseManifest(manifest), key);
  return {
    algorithm: 'ed25519',
    signature: signature.toString('base64'),
    ...(keyId ? { keyId } : {}),
  };
}

export function verifyManifestSignature(
  manifest: ProvenanceManifest,
  signature: ManifestSignature,
  publicKey: string | Buffer | KeyObject,
): boolean {
  if (signature.algorithm !== 'ed25519') {
    return false;
  }

  const key =
    typeof publicKey === 'string' || Buffer.isBuffer(publicKey)
      ? createPublicKey(publicKey)
      : publicKey;
  return verify(
    null,
    canonicaliseManifest(manifest),
    key,
    Buffer.from(signature.signature, 'base64'),
  );
}

export function verifyManifest(
  manifest: ProvenanceManifest,
  artifacts: Record<string, string | Buffer>,
): boolean {
  return manifest.steps.every((step) => {
    const data = artifacts[step.id];
    if (data === undefined) return false;
    return hashContent(data) === step.outputHash;
  });
}
