import crypto from 'crypto';

type SignerAlg = 'HS256' | 'HMAC-SHA256';

export type ProvenanceReceipt = {
  receiptId: string;
  runId: string;
  createdAt: string;
  codeDigest: string;
  inputsHash: string;
  outputsHash: string;
  signer: { kid: string; alg: SignerAlg };
  signature: string;
  summary: {
    runbook: string;
    status?: string;
    startedAt?: string;
    endedAt?: string;
  };
  evidence: {
    artifacts: Array<{ id: string; type: string; sha256: string; createdAt: string }>;
  };
};

export interface RunRow {
  id: string;
  runbook: string;
  status?: string;
  started_at?: string;
  ended_at?: string;
  tenant_id?: string;
}

export interface RunEventRow {
  kind: string;
  payload: any;
  ts: string;
}

export interface EvidenceArtifactRow {
  id: string;
  artifact_type: string;
  sha256_hash: string;
  created_at: string;
}

export function canonicalStringify(value: any): string {
  const seen = new WeakSet();

  const order = (input: any): any => {
    if (input === null || typeof input !== 'object') {
      return input;
    }

    if (seen.has(input)) {
      return null;
    }
    seen.add(input);

    if (Array.isArray(input)) {
      return input.map((item) => order(item));
    }

    const orderedEntries = Object.keys(input)
      .sort()
      .map((key) => [key, order(input[key])]);
    return Object.fromEntries(orderedEntries);
  };

  return JSON.stringify(order(value));
}

export function hashCanonical(value: any): string {
  return crypto.createHash('sha256').update(canonicalStringify(value)).digest('hex');
}

export function getCodeDigest(): string {
  return (
    process.env.GIT_SHA ||
    process.env.SOURCE_COMMIT ||
    process.env.BUILD_SHA ||
    'unknown'
  );
}

export function resolveSigningSecret(): { secret: string; kid: string; alg: SignerAlg } {
  const secret =
    process.env.EVIDENCE_SIGNING_SECRET ||
    (process.env.NODE_ENV !== 'production' ? 'dev-secret' : undefined);

  if (!secret) {
    throw new Error('EVIDENCE_SIGNING_SECRET is required to sign receipts');
  }

  return {
    secret,
    kid: process.env.EVIDENCE_SIGNER_KID || 'dev',
    alg: 'HS256',
  };
}

export function buildInputsPayload(run: RunRow, events: RunEventRow[]): any {
  const relevantEvents = events
    .filter((event) => event.kind === 'schedule.dispatched' || event.kind === 'input.provided')
    .map((event) => ({
      kind: event.kind,
      payload: event.payload,
    }));

  return {
    runbook: run.runbook,
    startedAt: run.started_at,
    events: relevantEvents,
  };
}

export function buildOutputsPayload(
  run: RunRow,
  artifacts: EvidenceArtifactRow[],
): any {
  const artifactHashes = [...artifacts]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((artifact) => ({ id: artifact.id, sha256: artifact.sha256_hash }));

  return {
    status: run.status,
    endedAt: run.ended_at,
    artifacts: artifactHashes,
  };
}

export function signReceiptPayload(payload: object, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(canonicalStringify(payload))
    .digest('base64url');
}

export function buildProvenanceReceipt(
  run: RunRow,
  events: RunEventRow[],
  artifacts: EvidenceArtifactRow[],
): ProvenanceReceipt {
  const createdAt = new Date().toISOString();
  const receiptId = crypto.randomUUID();

  const inputsPayload = buildInputsPayload(run, events);
  const outputsPayload = buildOutputsPayload(run, artifacts);

  const inputsHash = hashCanonical(inputsPayload);
  const outputsHash = hashCanonical(outputsPayload);

  const signerInfo = resolveSigningSecret();

  const baseReceipt = {
    receiptId,
    runId: run.id,
    createdAt,
    codeDigest: getCodeDigest(),
    inputsHash,
    outputsHash,
    signer: { kid: signerInfo.kid, alg: signerInfo.alg },
    summary: {
      runbook: run.runbook,
      status: run.status,
      startedAt: run.started_at,
      endedAt: run.ended_at,
    },
    evidence: {
      artifacts: artifacts.map((artifact) => ({
        id: artifact.id,
        type: artifact.artifact_type,
        sha256: artifact.sha256_hash,
        createdAt: artifact.created_at,
      })),
    },
  };

  const signature = signReceiptPayload(baseReceipt, signerInfo.secret);

  return {
    ...baseReceipt,
    signature,
  };
}
