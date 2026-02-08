import crypto from 'crypto';
import { signManifest } from '../evidence/attestation/sign.js';
import { ReportArtifact } from './types.js';

export interface EvidenceReceipt {
  id: string;
  reportId: string;
  issuedAt: string;
  artifactHash: string;
  manifestHash: string;
}

export interface EvidenceManifest {
  id: string;
  reportId: string;
  reportType: string;
  templateId: string;
  tenantId?: string;
  createdAt: string;
  format: string;
  artifact: {
    fileName: string;
    mimeType: string;
    checksum: string;
  };
  receipts: EvidenceReceipt[];
  previousHash?: string;
  manifestHash: string;
}

export interface StoredReport {
  id: string;
  reportType: string;
  templateId: string;
  tenantId?: string;
  createdAt: string;
  format: string;
  artifact: ReportArtifact;
  manifest: EvidenceManifest;
  signature: string;
  receipt: EvidenceReceipt;
}

function hashPayload(payload: string): string {
  return crypto.createHash('sha256').update(payload).digest('hex');
}

function sortObjectKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortObjectKeys);
  }
  if (value && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = sortObjectKeys((value as Record<string, unknown>)[key]);
        return acc;
      }, {});
  }
  return value;
}

function stableStringify(value: unknown): string {
  return JSON.stringify(sortObjectKeys(value));
}

export class ReportStore {
  private readonly reports = new Map<string, StoredReport>();
  private lastManifestHash?: string;

  async record(params: {
    reportId: string;
    reportType: string;
    templateId: string;
    tenantId?: string;
    artifact: ReportArtifact;
  }): Promise<StoredReport> {
    const artifactHash = hashPayload(params.artifact.buffer.toString('base64'));
    const receipt: EvidenceReceipt = {
      id: crypto.randomUUID(),
      reportId: params.reportId,
      issuedAt: new Date().toISOString(),
      artifactHash,
      manifestHash: '',
    };

    const manifestBase = {
      id: crypto.randomUUID(),
      reportId: params.reportId,
      reportType: params.reportType,
      templateId: params.templateId,
      tenantId: params.tenantId,
      createdAt: new Date().toISOString(),
      format: params.artifact.format,
      artifact: {
        fileName: params.artifact.fileName,
        mimeType: params.artifact.mimeType,
        checksum: artifactHash,
      },
      receipts: [
        {
          id: receipt.id,
          reportId: receipt.reportId,
          issuedAt: receipt.issuedAt,
          artifactHash: receipt.artifactHash,
        },
      ],
      previousHash: this.lastManifestHash,
    };

    const manifestHash = hashPayload(stableStringify(manifestBase));
    receipt.manifestHash = manifestHash;

    const manifest: EvidenceManifest = {
      ...manifestBase,
      receipts: [receipt],
      manifestHash,
    };

    const signature = await signManifest(manifest, { signerType: 'none' });

    const record: StoredReport = {
      id: params.reportId,
      reportType: params.reportType,
      templateId: params.templateId,
      tenantId: params.tenantId,
      createdAt: manifest.createdAt,
      format: params.artifact.format,
      artifact: params.artifact,
      manifest,
      signature,
      receipt,
    };

    this.reports.set(params.reportId, record);
    this.lastManifestHash = manifestHash;
    return record;
  }

  get(reportId: string, tenantId: string): StoredReport | undefined {
    const record = this.reports.get(reportId);
    if (!record) return undefined;
    // SECURITY: Strict tenant scoping - caller must provide tenantId and it must match
    // This prevents tenant bypass attacks where undefined tenantId could leak data
    if (record.tenantId !== tenantId) {
      return undefined;
    }
    return record;
  }
}
