import { auditLedgerFixtures, manifestFixtures } from './__fixtures__/watermarks.js';
import { MockWatermarkExtractor, WatermarkExtractor } from './MockWatermarkExtractor.js';

export interface ParsedWatermark {
  exportId: string;
  manifestHashPrefix: string;
  policyHash: string;
  raw: string;
}

export interface WatermarkVerificationResult {
  valid: boolean;
  manifestHash: string | null;
  observedWatermark: ParsedWatermark | null;
  mismatches: string[];
  reasonCodes: string[];
}

export class WatermarkVerificationService {
  private readonly manifestStore: typeof manifestFixtures;
  private readonly auditLedger: typeof auditLedgerFixtures;
  private readonly extractor: WatermarkExtractor;

  constructor(
    manifestStore: typeof manifestFixtures = manifestFixtures,
    auditLedger: typeof auditLedgerFixtures = auditLedgerFixtures,
    extractor: WatermarkExtractor = new MockWatermarkExtractor(),
  ) {
    this.manifestStore = manifestStore;
    this.auditLedger = auditLedger;
    this.extractor = extractor;
  }

  parseWatermark(rawWatermark: string): ParsedWatermark {
    const parts = rawWatermark.split(';').reduce<Record<string, string>>((acc, part) => {
      const [key, value] = part.split('=');
      if (key && value) {
        acc[key.trim()] = value.trim();
      }
      return acc;
    }, {});

    const exportId = parts.exportId;
    const manifestHashPrefix = parts.manifestHash;
    const policyHash = parts.policyHash;

    if (!exportId || !manifestHashPrefix || !policyHash) {
      throw new Error('Invalid watermark payload: missing required fields');
    }

    return {
      exportId,
      manifestHashPrefix,
      policyHash,
      raw: rawWatermark,
    };
  }

  async verify({
    exportId,
    artifactId,
    watermark,
  }: {
    exportId: string;
    artifactId?: string;
    watermark?: string;
  }): Promise<WatermarkVerificationResult> {
    const mismatches: string[] = [];

    try {
      const observedWatermark = this.parseWatermark(
        watermark || (await this.extractor.extract(artifactId || '')),
      );

      if (observedWatermark.exportId !== exportId) {
        mismatches.push('export-id-mismatch');
      }

      const manifest = this.manifestStore[exportId];
      if (!manifest) {
        return {
          valid: false,
          manifestHash: null,
          observedWatermark,
          mismatches: [...mismatches, 'manifest-not-found'],
          reasonCodes: [...mismatches, 'manifest-not-found'],
        };
      }

      const ledgerEntry = this.auditLedger[exportId];
      if (!ledgerEntry) {
        return {
          valid: false,
          manifestHash: manifest.manifestHash,
          observedWatermark,
          mismatches: [...mismatches, 'audit-ledger-missing'],
          reasonCodes: [...mismatches, 'audit-ledger-missing'],
        };
      }

      if (!manifest.manifestHash.startsWith(observedWatermark.manifestHashPrefix)) {
        mismatches.push('manifest-hash-mismatch');
      }

      if (!ledgerEntry.manifestHash.startsWith(observedWatermark.manifestHashPrefix)) {
        mismatches.push('audit-ledger-manifest-mismatch');
      }

      if (ledgerEntry.policyHash !== observedWatermark.policyHash) {
        mismatches.push('policy-hash-mismatch');
      }

      return {
        valid: mismatches.length === 0,
        manifestHash: manifest.manifestHash,
        observedWatermark,
        mismatches,
        reasonCodes: mismatches,
      };
    } catch (error: any) {
      return {
        valid: false,
        manifestHash: null,
        observedWatermark: null,
        mismatches: ['unreadable-watermark'],
        reasonCodes: ['unreadable-watermark', error.message],
      };
    }
  }
}
