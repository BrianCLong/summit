import { describe, expect, it } from 'vitest';
import type { ExportManifest, ManifestVerificationResult } from 'prov-ledger';
import {
  buildManifestSummary,
  buildSelectiveDisclosureToggles,
  manifestWarnings
} from '../src/index.ts';

const demoManifest: ExportManifest = {
  version: '0.1',
  createdAt: '2025-09-01T00:00:00Z',
  exportId: 'demo-export',
  artifacts: [
    {
      path: 'evidence/001.csv',
      sha256: 'ad186c862bc7bb198f7966188c3c7cd05eddbd7251ab29c463bb41034daae199',
      bytes: 128,
      role: 'source'
    }
  ],
  transforms: [
    {
      op: 'clean',
      tool: 'csv-normaliser',
      inputSha256: 'ad186c862bc7bb198f7966188c3c7cd05eddbd7251ab29c463bb41034daae199',
      outputSha256: 'ad186c862bc7bb198f7966188c3c7cd05eddbd7251ab29c463bb41034daae199',
      signer: 'connector:csv'
    }
  ],
  provenance: {
    source: 'CSV Upload',
    url: 'https://example.com/upload',
    fetchedAt: '2025-08-31T00:00:00Z'
  },
  policy: {
    redactions: [{ field: 'pii.email', reason: 'privacy' }],
    selectiveDisclosure: true,
    notes: 'Redacted analyst emails.'
  },
  signatures: [],
  merkleRoot: 'ad186c862bc7bb198f7966188c3c7cd05eddbd7251ab29c463bb41034daae199',
  unverifiable: ['missing-signatures']
};

describe('manifest view helpers', () => {
  it('buildManifestSummary returns UI friendly structures', () => {
    const summary = buildManifestSummary(demoManifest);
    expect(summary.exportId).toBe('demo-export');
    expect(summary.source).toBe('CSV Upload');
    expect(summary.artifacts[0]?.size).toBe('128 B');
    expect(summary.policy.redactions[0]).toBe('pii.email');
  });

  it('buildSelectiveDisclosureToggles reflects exclusions', () => {
    const toggles = buildSelectiveDisclosureToggles(demoManifest, {
      excludedFields: ['pii.email']
    });
    expect(toggles).toHaveLength(1);
    expect(toggles[0]?.included).toBe(false);
    expect(toggles[0]?.reason).toBe('privacy');
  });

  it('manifestWarnings merges manifest and verification issues', () => {
    const verification: ManifestVerificationResult = {
      status: 'tampered',
      issues: ['manifest merkleRoot does not match recomputed value'],
      manifest: demoManifest
    };
    const warnings = manifestWarnings(demoManifest, verification);
    expect(warnings.some(item => item.includes('Selective disclosure'))).toBe(true);
    expect(warnings).toContain('missing-signatures');
    expect(warnings).toContain('manifest merkleRoot does not match recomputed value');
  });
});
