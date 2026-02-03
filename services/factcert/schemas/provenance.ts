/**
 * FactCert Provenance Schema
 *
 * Defines the core certification identity and integration points
 * with Summit's core services.
 */

export type SupervisionState = 'PENDING' | 'APPROVED' | 'REJECTED';
export type ComplianceStatus = 'COMPLIANT' | 'NON_COMPLIANT' | 'PARTIAL';

export interface FactCertProvenance {
  // Core certification identity
  validator_cert_id: string;           // FactCert credential ID
  policy_version: string;               // Domain policy pack version
  supervision_state: SupervisionState;  // PENDING | APPROVED | REJECTED
  review_trace_hash: string;            // Hash-chained audit trail

  // Summit core service integrations
  audit: {
    audit_log_id: string;               // services/audit-log reference
    attestation_uri: string;            // services/attest artifact URI
    audit_blackbox_hash: string;        // services/audit-blackbox-service
  };

  // Trust & compliance
  trust_center: {
    assurance_level: string;            // services/trust-center level
    compliance_status: ComplianceStatus; // services/compliance-evaluator
    certification_bundle_uri: string;   // TEE-sealed evidence bundle
  };

  // Temporal tracking
  temporal: {
    issued_at: string;                  // ISO8601 timestamp
    valid_until?: string;               // Optional expiry
    bitemporal_ref?: string;            // services/bitemporal reference
  };

  // Blockchain anchoring (optional)
  blockchain_anchor?: {
    chain_id: string;                   // services/blockchain
    transaction_hash: string;
    block_number: number;
  };
}
