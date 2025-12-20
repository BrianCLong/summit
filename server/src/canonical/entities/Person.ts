/**
 * Canonical Entity: Person
 *
 * Represents an individual person with bitemporal tracking
 */

import { BaseCanonicalEntity, CanonicalEntityMetadata } from '../types';

export interface PersonIdentifiers {
  /** National ID numbers */
  nationalIds?: {
    country: string;
    type: string;
    value: string;
  }[];

  /** Passport numbers */
  passports?: {
    country: string;
    number: string;
    issuedDate?: Date;
    expiryDate?: Date;
  }[];

  /** Email addresses */
  emails?: string[];

  /** Phone numbers */
  phones?: {
    countryCode: string;
    number: string;
    type: 'mobile' | 'home' | 'work';
  }[];

  /** Social media handles */
  socialMedia?: {
    platform: string;
    handle: string;
    verified: boolean;
  }[];
}

export interface PersonName {
  /** Given name(s) */
  given?: string;

  /** Middle name(s) */
  middle?: string;

  /** Family name(s) */
  family?: string;

  /** Full name as commonly written */
  full: string;

  /** Alternative names, aliases */
  aliases?: string[];

  /** Name in original script (non-Latin) */
  nativeScript?: string;
}

export interface PersonDemographics {
  /** Date of birth */
  dateOfBirth?: Date;

  /** Place of birth */
  placeOfBirth?: {
    city?: string;
    region?: string;
    country: string;
  };

  /** Gender */
  gender?: string;

  /** Nationalities */
  nationalities?: string[];

  /** Languages spoken */
  languages?: string[];
}

export interface CanonicalPerson extends BaseCanonicalEntity, CanonicalEntityMetadata {
  entityType: 'Person';

  /** Person's name information */
  name: PersonName;

  /** Identifiers */
  identifiers: PersonIdentifiers;

  /** Demographic information */
  demographics?: PersonDemographics;

  /** Current status (alive, deceased, unknown) */
  status?: 'alive' | 'deceased' | 'unknown';

  /** Occupation(s) */
  occupations?: string[];

  /** Notable affiliations */
  affiliations?: {
    organizationId?: string;
    organizationName: string;
    role?: string;
    from?: Date;
    to?: Date;
  }[];

  /** Risk indicators */
  riskFlags?: {
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    detectedAt: Date;
  }[];

  /** Additional properties */
  properties: Record<string, any>;
}

/**
 * Create a new Person entity
 */
export function createPerson(
  data: Omit<CanonicalPerson, keyof BaseCanonicalEntity | 'entityType' | 'schemaVersion'>,
  baseFields: Omit<BaseCanonicalEntity, 'provenanceId'>,
  provenanceId: string,
): CanonicalPerson {
  return {
    ...baseFields,
    ...data,
    entityType: 'Person',
    schemaVersion: '1.0.0',
    provenanceId,
  };
}
