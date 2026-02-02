/**
 * FactMarkets Report Generator (Example)
 *
 * Demonstrates integration with FactCert for provenance attachment.
 */

import { attachProvenance } from '../../services/factcert/index.js';
import { generateEvidenceId } from './evidence_id.js';

export interface MarketReport {
  evidence_id: string;
  summary: string;
  claims: Array<{
    claim_id: string;
    text: string;
    status: 'VERIFIED' | 'INCONSISTENT' | 'UNVERIFIABLE' | 'NEEDS_REVIEW';
  }>;
  limitations: string[];
  needs_review: boolean;
}

export async function generateCertifiedReport(
  data: any,
  reviewers: string[]
): Promise<MarketReport> {
  // 1. Generate base report
  const report: MarketReport = {
    evidence_id: generateEvidenceId(data),
    summary: "Financial markets analysis report",
    claims: [
      {
        claim_id: "CLAIM-001",
        text: "Market manipulation detected in sector X",
        status: "VERIFIED"
      }
    ],
    limitations: [],
    needs_review: false
  };

  // 2. Attach FactCert provenance
  const certifiedReport = await attachProvenance(report, {
    domain: 'finance',
    reviewers: reviewers,
    auditOptions: { enableBlackbox: true, archiveToLake: true },
    assuranceLevel: 'enterprise'
  });

  return certifiedReport;
}
