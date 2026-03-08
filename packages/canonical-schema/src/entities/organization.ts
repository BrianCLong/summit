/**
 * Organization Entity Specialization
 * Canonical organization entity type with business identity attributes
 */

import { CanonicalEntityBase, CanonicalEntityType } from '../core/base';

export interface OrganizationName {
  value: string;
  type: 'legal' | 'dba' | 'former' | 'alias' | 'abbreviation';
  script?: string;
  confidence: number;
  validFrom?: Date;
  validTo?: Date;
}

export interface OrganizationIdentifier {
  type: 'lei' | 'duns' | 'tax_id' | 'ein' | 'vat' | 'swift' | 'registration_number' | 'custom';
  value: string;
  country?: string;
  issuedDate?: Date;
  expiryDate?: Date;
  confidence: number;
}

export interface OrganizationAddress {
  type: 'headquarters' | 'registered' | 'branch' | 'mailing';
  street?: string;
  city?: string;
  state?: string;
  country: string;
  postalCode?: string;
  coordinates?: { lat: number; lng: number };
  confidence: number;
  validFrom?: Date;
  validTo?: Date;
}

export interface OrganizationContact {
  type: 'email' | 'phone' | 'fax' | 'website';
  value: string;
  primary: boolean;
  confidence: number;
}

export interface OrganizationDetails {
  industry?: string;
  industryCodes?: Array<{
    system: 'NAICS' | 'SIC' | 'ISIC';
    code: string;
  }>;
  dateOfIncorporation?: Date;
  dateOfDissolution?: Date;
  jurisdiction?: string;
  legalForm?: string;                  // e.g., "LLC", "Corporation"
  employeeCount?: number;
  revenue?: number;
  currency?: string;
}

export interface OrganizationScreeningResult {
  list: string;                        // e.g., "OFAC SDN", "EU Sanctions"
  matched: boolean;
  score: number;
  matchedAt: Date;
}

/**
 * Organization Entity
 * Extends canonical base with organization-specific attributes
 */
export interface OrganizationEntity extends CanonicalEntityBase {
  type: CanonicalEntityType.ORGANIZATION;

  // Core attributes
  names: OrganizationName[];
  identifiers: OrganizationIdentifier[];
  addresses: OrganizationAddress[];
  contactInfo: OrganizationContact[];
  details?: OrganizationDetails;

  // Derived/enriched
  riskScore?: number;
  screeningResults?: OrganizationScreeningResult[];
}

/**
 * Helper functions for Organization entities
 */
export class OrganizationEntityHelpers {
  /**
   * Get the primary legal name
   */
  static getLegalName(org: OrganizationEntity): OrganizationName | undefined {
    return org.names.find(n => n.type === 'legal');
  }

  /**
   * Get headquarters address
   */
  static getHeadquarters(org: OrganizationEntity): OrganizationAddress | undefined {
    return org.addresses.find(a => a.type === 'headquarters');
  }

  /**
   * Get primary website
   */
  static getWebsite(org: OrganizationEntity): string | undefined {
    return org.contactInfo.find(c => c.type === 'website' && c.primary)?.value;
  }

  /**
   * Check if organization has a specific identifier type
   */
  static hasIdentifier(
    org: OrganizationEntity,
    type: OrganizationIdentifier['type']
  ): boolean {
    return org.identifiers.some(id => id.type === type);
  }

  /**
   * Get identifier by type
   */
  static getIdentifier(
    org: OrganizationEntity,
    type: OrganizationIdentifier['type']
  ): OrganizationIdentifier | undefined {
    return org.identifiers.find(id => id.type === type);
  }

  /**
   * Check if organization is active (not dissolved)
   */
  static isActive(org: OrganizationEntity): boolean {
    return !org.details?.dateOfDissolution;
  }

  /**
   * Get age of organization in years
   */
  static getAge(org: OrganizationEntity): number | null {
    if (!org.details?.dateOfIncorporation) {
      return null;
    }

    const endDate = org.details.dateOfDissolution || new Date();
    const startDate = new Date(org.details.dateOfIncorporation);
    const ageMs = endDate.getTime() - startDate.getTime();
    return Math.floor(ageMs / (1000 * 60 * 60 * 24 * 365.25));
  }

  /**
   * Normalize an organization name for ER matching
   */
  static normalizeName(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')            // Collapse whitespace
      .replace(/\b(inc|llc|ltd|corp|corporation|company|co)\b\.?/gi, '') // Remove legal suffixes
      .replace(/[^\w\s]/g, '')         // Remove special chars
      .trim();
  }
}
