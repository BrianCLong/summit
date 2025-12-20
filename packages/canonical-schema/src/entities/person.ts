/**
 * Person Entity Specialization
 * Canonical person entity type with rich identity attributes
 */

import { CanonicalEntityBase, CanonicalEntityType } from '../core/base';

export interface PersonName {
  value: string;
  type: 'legal' | 'alias' | 'former' | 'aka' | 'maiden' | 'nickname';
  script?: string;                     // e.g., "Latin", "Cyrillic"
  confidence: number;
  validFrom?: Date;
  validTo?: Date;
}

export interface PersonIdentifier {
  type: 'ssn' | 'passport' | 'license' | 'tax_id' | 'national_id' | 'employee_id' | 'custom';
  value: string;
  country?: string;
  issuedDate?: Date;
  expiryDate?: Date;
  confidence: number;
}

export interface PersonContact {
  type: 'email' | 'phone' | 'address';
  value: string;
  primary: boolean;
  confidence: number;
}

export interface PersonDemographics {
  dateOfBirth?: Date;
  dateOfBirthPrecision?: 'day' | 'month' | 'year';
  placeOfBirth?: string;
  gender?: 'M' | 'F' | 'NB' | 'U';
  nationality?: string[];
  occupation?: string;
}

export interface PersonScreeningResult {
  list: string;                        // e.g., "OFAC SDN"
  matched: boolean;
  score: number;
  matchedAt: Date;
}

/**
 * Person Entity
 * Extends canonical base with person-specific attributes
 */
export interface PersonEntity extends CanonicalEntityBase {
  type: CanonicalEntityType.PERSON;

  // Core attributes
  names: PersonName[];
  identifiers: PersonIdentifier[];
  contactInfo: PersonContact[];
  demographics?: PersonDemographics;

  // Derived/enriched
  riskScore?: number;
  screeningResults?: PersonScreeningResult[];
}

/**
 * Helper functions for Person entities
 */
export class PersonEntityHelpers {
  /**
   * Get the primary legal name
   */
  static getLegalName(person: PersonEntity): PersonName | undefined {
    return person.names.find(n => n.type === 'legal');
  }

  /**
   * Get all email addresses
   */
  static getEmails(person: PersonEntity): string[] {
    return person.contactInfo
      .filter(c => c.type === 'email')
      .map(c => c.value);
  }

  /**
   * Get the primary email
   */
  static getPrimaryEmail(person: PersonEntity): string | undefined {
    return person.contactInfo.find(c => c.type === 'email' && c.primary)?.value;
  }

  /**
   * Check if person has a specific identifier type
   */
  static hasIdentifier(person: PersonEntity, type: PersonIdentifier['type']): boolean {
    return person.identifiers.some(id => id.type === type);
  }

  /**
   * Get identifier by type
   */
  static getIdentifier(
    person: PersonEntity,
    type: PersonIdentifier['type']
  ): PersonIdentifier | undefined {
    return person.identifiers.find(id => id.type === type);
  }

  /**
   * Calculate age from date of birth
   */
  static getAge(person: PersonEntity): number | null {
    if (!person.demographics?.dateOfBirth) {
      return null;
    }

    const today = new Date();
    const birthDate = new Date(person.demographics.dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  }

  /**
   * Normalize a person name for ER matching
   */
  static normalizeName(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')            // Collapse whitespace
      .replace(/[^\w\s]/g, '');        // Remove special chars
  }
}
