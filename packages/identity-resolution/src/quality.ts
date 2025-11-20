/**
 * Data quality assessment for identity records
 */

import type {
  IdentityRecord,
  DataQualityMetrics
} from './types.js';

/**
 * Assess data quality of an identity record
 */
export function assessDataQuality(record: IdentityRecord): DataQualityMetrics {
  return {
    completeness: calculateCompleteness(record),
    accuracy: calculateAccuracy(record),
    consistency: calculateConsistency(record),
    timeliness: calculateTimeliness(record),
    uniqueness: calculateUniqueness(record),
    validity: calculateValidity(record)
  };
}

/**
 * Calculate completeness score (0-1)
 */
export function calculateCompleteness(record: IdentityRecord): number {
  const requiredFields = getRequiredFields(record.entityType);
  const populatedFields = requiredFields.filter(
    field => record.attributes[field] !== null &&
             record.attributes[field] !== undefined &&
             record.attributes[field] !== ''
  );

  return populatedFields.length / requiredFields.length;
}

/**
 * Get required fields for entity type
 */
function getRequiredFields(entityType: string): string[] {
  const fieldMap: Record<string, string[]> = {
    person: ['firstName', 'lastName', 'email', 'phone'],
    organization: ['name', 'address', 'phone'],
    device: ['deviceId', 'type', 'manufacturer'],
    account: ['username', 'email', 'platform']
  };

  return fieldMap[entityType] || [];
}

/**
 * Calculate accuracy score based on validation rules
 */
export function calculateAccuracy(record: IdentityRecord): number {
  let validFields = 0;
  let totalFields = 0;

  for (const [field, value] of Object.entries(record.attributes)) {
    if (value === null || value === undefined) continue;

    totalFields++;

    if (isValidField(field, value)) {
      validFields++;
    }
  }

  return totalFields > 0 ? validFields / totalFields : 0;
}

/**
 * Validate field value based on field type
 */
export function isValidField(field: string, value: any): boolean {
  const lowerField = field.toLowerCase();

  if (lowerField.includes('email')) {
    return isValidEmail(value);
  }

  if (lowerField.includes('phone')) {
    return isValidPhone(value);
  }

  if (lowerField.includes('url') || lowerField.includes('website')) {
    return isValidURL(value);
  }

  if (lowerField.includes('date')) {
    return isValidDate(value);
  }

  // Default: non-empty string or valid number
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }

  if (typeof value === 'number') {
    return !isNaN(value);
  }

  return true;
}

/**
 * Validate email address
 */
export function isValidEmail(email: string): boolean {
  if (typeof email !== 'string') return false;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number
 */
export function isValidPhone(phone: string): boolean {
  if (typeof phone !== 'string') return false;

  // Remove non-digit characters
  const digits = phone.replace(/\D/g, '');

  // Should have at least 10 digits
  return digits.length >= 10;
}

/**
 * Validate URL
 */
export function isValidURL(url: string): boolean {
  if (typeof url !== 'string') return false;

  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate date
 */
export function isValidDate(date: any): boolean {
  if (date instanceof Date) {
    return !isNaN(date.getTime());
  }

  if (typeof date === 'string') {
    const parsed = new Date(date);
    return !isNaN(parsed.getTime());
  }

  return false;
}

/**
 * Calculate consistency score
 */
export function calculateConsistency(record: IdentityRecord): number {
  let consistencyScore = 1.0;

  // Check email/domain consistency
  const email = record.attributes.email;
  const domain = record.attributes.domain;

  if (email && domain) {
    const emailDomain = email.split('@')[1];
    if (emailDomain !== domain) {
      consistencyScore -= 0.2;
    }
  }

  // Check phone/country consistency
  const phone = record.attributes.phone;
  const country = record.attributes.country;

  if (phone && country) {
    const phoneCountry = inferCountryFromPhone(phone);
    if (phoneCountry && phoneCountry !== country) {
      consistencyScore -= 0.2;
    }
  }

  // Check name consistency
  const firstName = record.attributes.firstName;
  const lastName = record.attributes.lastName;
  const fullName = record.attributes.fullName;

  if (firstName && lastName && fullName) {
    if (!fullName.includes(firstName) || !fullName.includes(lastName)) {
      consistencyScore -= 0.2;
    }
  }

  return Math.max(0, consistencyScore);
}

/**
 * Infer country from phone number
 */
function inferCountryFromPhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, '');

  if (digits.startsWith('1')) return 'US';
  if (digits.startsWith('44')) return 'GB';
  if (digits.startsWith('86')) return 'CN';
  // Add more country codes as needed

  return null;
}

/**
 * Calculate timeliness score
 */
export function calculateTimeliness(record: IdentityRecord): number {
  const now = new Date();
  const age = now.getTime() - record.updatedAt.getTime();

  // Data older than 1 year gets lower score
  const oneYear = 365 * 24 * 60 * 60 * 1000;

  if (age <= oneYear) {
    return 1.0;
  }

  // Linear decay over 5 years
  const fiveYears = 5 * oneYear;
  return Math.max(0, 1 - (age - oneYear) / (fiveYears - oneYear));
}

/**
 * Calculate uniqueness score
 */
export function calculateUniqueness(record: IdentityRecord): number {
  // This would typically check against a database
  // For now, return metadata confidence
  return record.metadata.confidence;
}

/**
 * Calculate validity score
 */
export function calculateValidity(record: IdentityRecord): number {
  return calculateAccuracy(record);
}

/**
 * Generate data quality report
 */
export function generateQualityReport(
  records: IdentityRecord[]
): {
  overall: DataQualityMetrics;
  byRecord: Map<string, DataQualityMetrics>;
  issues: QualityIssue[];
} {
  const byRecord = new Map<string, DataQualityMetrics>();
  const issues: QualityIssue[] = [];

  let totalCompleteness = 0;
  let totalAccuracy = 0;
  let totalConsistency = 0;
  let totalTimeliness = 0;
  let totalUniqueness = 0;
  let totalValidity = 0;

  for (const record of records) {
    const metrics = assessDataQuality(record);
    byRecord.set(record.id, metrics);

    totalCompleteness += metrics.completeness;
    totalAccuracy += metrics.accuracy;
    totalConsistency += metrics.consistency;
    totalTimeliness += metrics.timeliness;
    totalUniqueness += metrics.uniqueness;
    totalValidity += metrics.validity;

    // Identify issues
    if (metrics.completeness < 0.7) {
      issues.push({
        recordId: record.id,
        type: 'completeness',
        severity: 'high',
        message: `Record has low completeness: ${(metrics.completeness * 100).toFixed(1)}%`
      });
    }

    if (metrics.accuracy < 0.8) {
      issues.push({
        recordId: record.id,
        type: 'accuracy',
        severity: 'medium',
        message: `Record has low accuracy: ${(metrics.accuracy * 100).toFixed(1)}%`
      });
    }

    if (metrics.consistency < 0.8) {
      issues.push({
        recordId: record.id,
        type: 'consistency',
        severity: 'medium',
        message: `Record has inconsistent data: ${(metrics.consistency * 100).toFixed(1)}%`
      });
    }
  }

  const count = records.length;

  return {
    overall: {
      completeness: totalCompleteness / count,
      accuracy: totalAccuracy / count,
      consistency: totalConsistency / count,
      timeliness: totalTimeliness / count,
      uniqueness: totalUniqueness / count,
      validity: totalValidity / count
    },
    byRecord,
    issues
  };
}

export interface QualityIssue {
  recordId: string;
  type: 'completeness' | 'accuracy' | 'consistency' | 'timeliness' | 'validity';
  severity: 'low' | 'medium' | 'high';
  message: string;
}
