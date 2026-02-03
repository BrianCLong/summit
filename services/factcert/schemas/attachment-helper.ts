/**
 * FactCert Attachment Helper
 *
 * Utilities for embedding provenance metadata into reports and certified outputs.
 */

import { FactCertProvenance } from './provenance';

export function embedProvenance<T extends object>(
  target: T,
  provenance: FactCertProvenance
): T & { provenance: FactCertProvenance } {
  return {
    ...target,
    provenance
  };
}

export function extractProvenance(output: any): FactCertProvenance | undefined {
  return output?.provenance;
}
