/**
 * FactCert Shared Provenance Module
 *
 * Public API for attaching and validating FactCert provenance.
 */

import { createHash, randomBytes } from 'node:crypto';
import { FactCertProvenance, SupervisionState } from './schemas/provenance.js';
import { embedProvenance } from './schemas/attachment-helper.js';
import { logProvenanceEvent, AuditOptions } from './integrations/audit-logger.js';
import { generateAttestation } from './integrations/attestation-client.js';
import { registerInTrustCenter } from './integrations/trust-center-client.js';
import { anchorToBlockchain } from './integrations/blockchain-anchor.js';

export * from './schemas/provenance.js';
export * from './schemas/attachment-helper.js';
export * from './schemas/validation.js';

export interface AttachProvenanceOptions {
  domain: string;
  reviewers: string[];
  policyVersion?: string;
  auditOptions?: AuditOptions;
  assuranceLevel?: string;
  enableBlockchain?: boolean;
}

/**
 * Attaches FactCert provenance to a report, integrating with Summit core services.
 */
export async function attachProvenance<T extends object>(
  report: T,
  options: AttachProvenanceOptions
): Promise<T & { provenance: FactCertProvenance }> {
  // Use crypto for robust ID generation
  const validatorCertId = `CERT-${options.domain.toUpperCase()}-${randomBytes(4).toString('hex').toUpperCase()}`;

  // Create a robust trace hash of the report
  const reviewTraceHash = createHash('sha256')
    .update(JSON.stringify(report))
    .digest('hex');

  // 1. Audit Integration
  const auditInfo = await logProvenanceEvent(validatorCertId, report, options.auditOptions);

  // 2. Attestation Integration
  const attestationUri = await generateAttestation(report, options.domain);

  // 3. Trust Center Integration
  const trustInfo = await registerInTrustCenter(validatorCertId, options.assuranceLevel || 'standard');

  // 4. Blockchain Anchoring (Optional)
  let blockchainAnchor;
  if (options.enableBlockchain) {
    blockchainAnchor = await anchorToBlockchain(reviewTraceHash);
  }

  const provenance: FactCertProvenance = {
    validator_cert_id: validatorCertId,
    policy_version: options.policyVersion || '1.0.0',
    supervision_state: 'APPROVED',
    review_trace_hash: reviewTraceHash,
    audit: {
      audit_log_id: auditInfo.audit_log_id,
      attestation_uri: attestationUri,
      audit_blackbox_hash: auditInfo.audit_blackbox_hash,
    },
    trust_center: {
      assurance_level: options.assuranceLevel || 'standard',
      compliance_status: trustInfo.compliance_status,
      certification_bundle_uri: trustInfo.certification_bundle_uri,
    },
    temporal: {
      issued_at: new Date().toISOString(),
    },
    blockchain_anchor: blockchainAnchor,
  };

  return embedProvenance(report, provenance);
}
