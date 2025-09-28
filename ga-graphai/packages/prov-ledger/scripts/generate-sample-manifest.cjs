const { createHash, createHmac } = require('node:crypto');
const { writeFileSync } = require('node:fs');
const { resolve } = require('node:path');

function canonicalize(value) {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    const result = {};
    for (const [key, val] of entries) {
      result[key] = canonicalize(val);
    }
    return result;
  }
  return value;
}

function canonicalHash(value) {
  return createHash('sha256')
    .update(JSON.stringify(canonicalize(value)))
    .digest('hex');
}

function buildEvidenceItem({ uri, hash, bytes, mediaType, label, annotations, role }) {
  return {
    uri,
    hash,
    algorithm: 'sha256',
    bytes,
    mediaType,
    label,
    annotations,
    role,
  };
}

const chainId = 'sample-chain';
const signer = 'demo-signer';
const signingKey = 'demo-secret';
const environment = 'demo';
const claims = [];
let previousHash;

function sign(hash) {
  return createHmac('sha256', signingKey).update(hash).digest('hex');
}

function persistClaim(draft) {
  const hash = canonicalHash({
    chainId: draft.chainId,
    claimId: draft.claimId,
    layer: draft.layer,
    actor: draft.actor,
    assertedAt: draft.assertedAt,
    context: draft.context,
    evidence: draft.evidence,
    transform: draft.transform,
    previousHash,
  });
  const signature = sign(hash);
  const record = { ...draft, previousHash, hash, signature };
  claims.push(record);
  previousHash = hash;
  return record;
}

const now = new Date().toISOString();
const ingestContext = {
  tenantId: 'tenant-demo',
  datasetId: 'dataset-demo',
  environment,
  runId: 'sample-run',
  jobId: 'sample-job',
  sourceUri: 's3://incoming/sample.csv',
  connector: 'csv',
};
const ingest = persistClaim({
  chainId,
  claimId: 'claim-ingest',
  layer: 'ingest',
  actor: signer,
  assertedAt: now,
  context: ingestContext,
  evidence: {
    inputs: [
      buildEvidenceItem({
        uri: 's3://incoming/sample.csv',
        hash: canonicalHash({
          uri: 's3://incoming/sample.csv',
          summary: { delimiter: ',' },
          jobId: 'sample-job',
          runId: 'sample-run',
        }),
        mediaType: 'text/csv',
        label: 'source',
        role: 'input',
      }),
    ],
    outputs: [
      buildEvidenceItem({
        uri: 'graph://dataset-demo/ingest/sample-run',
        hash: canonicalHash({
          datasetId: 'dataset-demo',
          runId: 'sample-run',
          recordCount: 2,
          bytes: 256,
        }),
        bytes: 256,
        mediaType: 'application/json',
        label: 'normalized-records',
        role: 'output',
      }),
    ],
  },
  transform: {
    id: 'ingest',
    description: 'Source ingestion',
    parameters: {
      recordCount: 2,
      sourceMediaType: 'text/csv',
    },
  },
});

const transform = persistClaim({
  chainId,
  claimId: 'claim-transform',
  layer: 'transform',
  actor: signer,
  assertedAt: new Date(Date.now() + 1000).toISOString(),
  context: {
    tenantId: 'tenant-demo',
    datasetId: 'dataset-demo',
    environment,
    runId: 'sample-run',
    transformId: 'normalize-fields',
  },
  evidence: {
    inputs: ingest.evidence.outputs.map((output) => buildEvidenceItem({
      uri: output.uri,
      hash: output.hash,
      bytes: output.bytes,
      mediaType: output.mediaType,
      label: output.label,
      annotations: output.annotations,
      role: 'input',
    })),
    outputs: [
      buildEvidenceItem({
        uri: 'graph://dataset-demo/transform/normalize-fields/sample-run',
        hash: canonicalHash({
          datasetId: 'dataset-demo',
          runId: 'sample-run',
          transformId: 'normalize-fields',
          recordCount: 2,
          bytes: 300,
        }),
        bytes: 300,
        mediaType: 'application/json',
        label: 'transformed-records',
        role: 'output',
      }),
    ],
  },
  transform: {
    id: 'normalize-fields',
    description: 'Data transformation',
    parameters: { rules: ['trim', 'toLowerCase'] },
  },
});

const responseBody = { status: 'ok', exported: 2 };
const responseString = JSON.stringify(canonicalize(responseBody));
const api = persistClaim({
  chainId,
  claimId: 'claim-api',
  layer: 'api',
  actor: signer,
  assertedAt: new Date(Date.now() + 2000).toISOString(),
  context: {
    tenantId: 'system',
    datasetId: 'dataset-demo',
    environment,
    requestId: 'request-demo',
    sourceUri: '/api/export',
  },
  evidence: {
    inputs: transform.evidence.outputs.map((output) => buildEvidenceItem({
      uri: output.uri,
      hash: output.hash,
      bytes: output.bytes,
      mediaType: output.mediaType,
      label: output.label,
      annotations: output.annotations,
      role: 'input',
    })),
    outputs: [
      buildEvidenceItem({
        uri: 'urn:response:request-demo',
        hash: canonicalHash(responseBody),
        bytes: Buffer.byteLength(responseString, 'utf-8'),
        mediaType: 'application/json',
        label: 'response',
        role: 'output',
      }),
    ],
    references: [
      buildEvidenceItem({
        uri: 'urn:request:request-demo',
        hash: canonicalHash({ format: 'json', datasetId: 'dataset-demo' }),
        mediaType: 'application/json',
        label: 'request',
        role: 'reference',
      }),
    ],
  },
  transform: {
    description: 'API response delivery',
    parameters: {
      route: '/api/export',
      method: 'POST',
      statusCode: 200,
    },
  },
});

const artifacts = [
  {
    path: 'exports/demo/export.json',
    bytes: 512,
    claimId: api.claimId,
    role: 'dataset',
  },
  {
    path: 'exports/demo/manifest.json',
    bytes: 128,
    claimId: api.claimId,
    role: 'manifest',
  },
].map((artifact) => ({
  path: artifact.path,
  hash: canonicalHash({ path: artifact.path, claimId: artifact.claimId, bytes: artifact.bytes }),
  algorithm: 'sha256',
  bytes: artifact.bytes,
  claimId: artifact.claimId,
  role: artifact.role,
}));

const manifest = {
  manifestVersion: '1.0.0',
  exportId: 'export-demo',
  createdAt: new Date(Date.now() + 3000).toISOString(),
  dataset: {
    id: 'dataset-demo',
    name: 'Demo Dataset',
    description: 'Sample dataset export for documentation.',
    totalRecords: 2,
    sensitivity: ['internal'],
    tags: ['demo', 'provenance'],
    owner: 'Data Team',
  },
  destination: {
    uri: 's3://exports/demo/export.json',
    format: 'json',
  },
  claimChain: {
    chainId,
    head: api.hash,
    claims,
  },
  ledgerAnchors: {
    ingest: ingest.hash,
    transform: transform.hash,
    api: api.hash,
  },
  artifacts,
  verification: {
    manifestHash: '',
    includedHashes: claims.map((claim) => claim.hash),
  },
  signatures: [],
};

manifest.verification.manifestHash = canonicalHash({
  manifestVersion: manifest.manifestVersion,
  exportId: manifest.exportId,
  createdAt: manifest.createdAt,
  dataset: manifest.dataset,
  destination: manifest.destination,
  claimChain: {
    chainId: manifest.claimChain.chainId,
    head: manifest.claimChain.head,
    claimHashes: manifest.claimChain.claims.map((claim) => claim.hash),
  },
  artifacts: manifest.artifacts.map((artifact) => ({
    path: artifact.path,
    hash: artifact.hash,
    bytes: artifact.bytes,
    claimId: artifact.claimId,
    role: artifact.role,
  })),
  ledgerAnchors: manifest.ledgerAnchors,
});

manifest.signatures.push({
  keyId: `${signer}#export`,
  signer,
  algorithm: 'hmac-sha256',
  signedAt: manifest.createdAt,
  signature: sign(manifest.verification.manifestHash),
});

const outputPath = resolve(__dirname, '../../../..', 'samples/provenance/export-manifest.signed.json');
writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf-8');
