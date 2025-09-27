import path from 'node:path';
import {
  ClaimLedger,
  canonicalHash,
  type IngestClaimOptions,
  type TransformClaimOptions,
} from '@ga-graphai/prov-ledger';

type IngestProvenanceInput = {
  jobId: string;
  runId: string;
  datasetId: string;
  tenantId: string;
  sourceType: string;
  sourceConfig: Record<string, unknown>;
  records: unknown[];
};

type TransformProvenanceInput = {
  previousClaimId: string;
  runId: string;
  jobId: string;
  datasetId: string;
  tenantId: string;
  transformId: string;
  rules: unknown[];
  rawRecords: unknown[];
  transformedRecords: unknown[];
};

const storagePath = process.env.PROVENANCE_STORAGE_PATH
  ? path.resolve(process.env.PROVENANCE_STORAGE_PATH)
  : path.resolve(process.cwd(), '.data', 'feed-provenance.json');

const claimLedger = new ClaimLedger({
  chainId: process.env.PROVENANCE_CHAIN_ID ?? 'feed-processor',
  signer: process.env.PROVENANCE_SIGNER ?? 'feed-processor',
  signingKey: process.env.PROVENANCE_SIGNING_KEY ?? 'feed-processor-dev-secret',
  storagePath,
  environment: process.env.NODE_ENV ?? 'development',
});

export function getClaimLedger(): ClaimLedger {
  return claimLedger;
}

function buildIngestOptions(input: IngestProvenanceInput): IngestClaimOptions {
  const sourceDigest = canonicalHash({
    type: input.sourceType,
    config: input.sourceConfig,
  });
  const recordDigest = canonicalHash({
    runId: input.runId,
    records: input.records,
  });
  const byteSize = Buffer.byteLength(JSON.stringify(input.records), 'utf-8');

  return {
    runId: input.runId,
    jobId: input.jobId,
    tenantId: input.tenantId,
    datasetId: input.datasetId,
    source: {
      uri: `ingest://${input.sourceType}/${input.jobId}`,
      mediaType: 'application/json',
      label: input.sourceType,
      summary: input.sourceConfig,
      hash: sourceDigest,
    },
    output: {
      bytes: byteSize,
      recordCount: input.records.length,
      hash: recordDigest,
    },
    metadata: {
      sourceType: input.sourceType,
    },
  };
}

export function recordIngestProvenance(input: IngestProvenanceInput) {
  return claimLedger.recordIngestClaim(buildIngestOptions(input));
}

function buildTransformOptions(input: TransformProvenanceInput): TransformClaimOptions {
  const digest = canonicalHash({
    runId: input.runId,
    transformId: input.transformId,
    output: input.transformedRecords,
  });
  const byteSize = Buffer.byteLength(JSON.stringify(input.transformedRecords), 'utf-8');

  return {
    previousClaimId: input.previousClaimId,
    transformId: input.transformId,
    tenantId: input.tenantId,
    datasetId: input.datasetId,
    runId: input.runId,
    parameters: {
      rules: input.rules,
    },
    output: {
      bytes: byteSize,
      recordCount: input.transformedRecords.length,
      hash: digest,
    },
  };
}

export function recordTransformProvenance(input: TransformProvenanceInput) {
  return claimLedger.recordTransformClaim(buildTransformOptions(input));
}

export function exportProvenanceResync(startHash?: string) {
  return claimLedger.exportResyncBundle(startHash);
}
