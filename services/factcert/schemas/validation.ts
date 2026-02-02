/**
 * FactCert Schema Validation
 *
 * Ensures provenance metadata conforms to the FactCertProvenance interface.
 */

import { FactCertProvenance } from './provenance';

export function validateProvenance(provenance: any): provenance is FactCertProvenance {
  if (!provenance || typeof provenance !== 'object') return false;

  const requiredFields: (keyof FactCertProvenance)[] = [
    'validator_cert_id',
    'policy_version',
    'supervision_state',
    'review_trace_hash',
    'audit',
    'trust_center',
    'temporal'
  ];

  return requiredFields.every(field => field in provenance);
}
