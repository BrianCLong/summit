/**
 * Data normalization for identity resolution
 */

import type { IdentityRecord, NormalizationRule } from './types.js';

/**
 * Normalize an identity record
 */
export function normalizeRecord(record: IdentityRecord): IdentityRecord {
  const normalized = { ...record };
  normalized.attributes = normalizeAttributes(record.attributes);
  return normalized;
}

/**
 * Normalize attributes object
 */
export function normalizeAttributes(
  attributes: Record<string, any>
): Record<string, any> {
  const normalized: Record<string, any> = {};

  for (const [key, value] of Object.entries(attributes)) {
    normalized[key] = normalizeValue(value, key);
  }

  return normalized;
}

/**
 * Normalize a single value based on field name
 */
export function normalizeValue(value: any, fieldName: string): any {
  if (value === null || value === undefined) return value;

  const lowerField = fieldName.toLowerCase();

  if (lowerField.includes('email')) {
    return normalizeEmail(value);
  }

  if (lowerField.includes('phone')) {
    return normalizePhone(value);
  }

  if (lowerField.includes('name')) {
    return normalizeName(value);
  }

  if (lowerField.includes('address')) {
    return normalizeAddress(value);
  }

  if (lowerField.includes('ssn') || lowerField.includes('social')) {
    return normalizeSSN(value);
  }

  if (typeof value === 'string') {
    return value.trim();
  }

  return value;
}

/**
 * Normalize email address
 */
export function normalizeEmail(email: string): string {
  if (typeof email !== 'string') return email;

  // Convert to lowercase and trim
  let normalized = email.toLowerCase().trim();

  // Remove dots in Gmail addresses (gmail ignores dots)
  const [user, domain] = normalized.split('@');
  if (domain === 'gmail.com') {
    normalized = user.replace(/\./g, '') + '@' + domain;
  }

  // Remove + aliases (e.g., user+tag@domain.com -> user@domain.com)
  normalized = normalized.replace(/\+[^@]*@/, '@');

  return normalized;
}

/**
 * Normalize phone number
 */
export function normalizePhone(phone: string): string {
  if (typeof phone !== 'string') return phone;

  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');

  // Handle US phone numbers
  if (digits.length === 10) {
    return `+1${digits}`;
  }

  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }

  // Return with + prefix if not already present
  return digits.startsWith('+') ? digits : `+${digits}`;
}

/**
 * Normalize person name
 */
export function normalizeName(name: string): string {
  if (typeof name !== 'string') return name;

  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/\b\w/g, c => c.toUpperCase()); // Title case
}

/**
 * Normalize address
 */
export function normalizeAddress(address: string): string {
  if (typeof address !== 'string') return address;

  let normalized = address.toLowerCase().trim();

  // Standardize common abbreviations
  const replacements: Record<string, string> = {
    'street': 'st',
    'avenue': 'ave',
    'road': 'rd',
    'drive': 'dr',
    'lane': 'ln',
    'boulevard': 'blvd',
    'court': 'ct',
    'place': 'pl',
    'apartment': 'apt',
    'suite': 'ste',
    'north': 'n',
    'south': 's',
    'east': 'e',
    'west': 'w'
  };

  for (const [full, abbrev] of Object.entries(replacements)) {
    normalized = normalized.replace(
      new RegExp(`\\b${full}\\b`, 'gi'),
      abbrev
    );
  }

  // Normalize whitespace
  normalized = normalized.replace(/\s+/g, ' ');

  return normalized;
}

/**
 * Normalize SSN
 */
export function normalizeSSN(ssn: string): string {
  if (typeof ssn !== 'string') return ssn;

  // Remove all non-digit characters
  const digits = ssn.replace(/\D/g, '');

  // Format as XXX-XX-XXXX
  if (digits.length === 9) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
  }

  return digits;
}

/**
 * Normalize date to ISO format
 */
export function normalizeDate(date: string | Date): string {
  if (date instanceof Date) {
    return date.toISOString();
  }

  if (typeof date === 'string') {
    const parsed = new Date(date);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  return date.toString();
}

/**
 * Apply custom normalization rules
 */
export function applyNormalizationRules(
  value: string,
  rules: NormalizationRule[]
): string {
  let result = value;

  for (const rule of rules) {
    switch (rule.type) {
      case 'lowercase':
        result = result.toLowerCase();
        break;
      case 'uppercase':
        result = result.toUpperCase();
        break;
      case 'trim':
        result = result.trim();
        break;
      case 'format':
        if (rule.pattern && rule.replacement) {
          result = result.replace(new RegExp(rule.pattern, 'g'), rule.replacement);
        }
        break;
      case 'standardize':
        // Custom standardization logic
        break;
    }
  }

  return result;
}

/**
 * Remove diacritics from string
 */
export function removeDiacritics(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Standardize whitespace
 */
export function standardizeWhitespace(str: string): string {
  return str.replace(/\s+/g, ' ').trim();
}

/**
 * Extract digits from string
 */
export function extractDigits(str: string): string {
  return str.replace(/\D/g, '');
}

/**
 * Extract alphanumeric characters
 */
export function extractAlphanumeric(str: string): string {
  return str.replace(/[^a-zA-Z0-9]/g, '');
}
