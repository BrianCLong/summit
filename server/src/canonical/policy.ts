/**
 * Canonical Policy Labels
 *
 * Defines the security, legal, and retention policies attached to entities and edges.
 */

export interface PolicyLabels {
  /** Origin of the data (Source ID, Feed, etc.) */
  origin?: string;

  /** Sensitivity Level (e.g., 'public', 'internal', 'confidential', 'restricted') */
  sensitivity?: 'public' | 'internal' | 'confidential' | 'restricted';

  /** Security Clearance required to view (e.g., 'TS', 'S', 'U') */
  clearance?: string;

  /** Legal Basis for processing (e.g., 'consent', 'contract', 'legitimate_interest') */
  legalBasis?: string;

  /** Need-To-Know compartments */
  needToKnow?: string[];

  /** Purpose of collection/use */
  purpose?: string[];

  /** Retention policy identifier */
  retention?: string;

  /** License Class (e.g., 'CC-BY', 'proprietary') */
  licenseClass?: string;
}

export interface CanonicalEntityWithPolicy {
  policy?: PolicyLabels;
}
