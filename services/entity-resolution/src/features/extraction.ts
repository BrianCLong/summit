/**
 * Entity Resolution Service - Feature Extraction
 *
 * Extracts and computes features for entity pairs
 */

import { EntityRecord, FeatureVector } from '../domain/EntityRecord.js';
import {
  stringSimilarity,
  jaroWinklerSimilarity,
  geoDistanceKm,
  temporalOverlapScore,
  sharedIdentifiersCount,
} from './similarity.js';
import {
  normalizeName,
  normalizeEmail,
  normalizeOrg,
  normalizePhone,
} from './normalization.js';

/**
 * Build a feature vector for a pair of entity records
 * This function is extensible and can handle various attribute mappings
 */
export function buildFeatureVector(a: EntityRecord, b: EntityRecord): FeatureVector {
  const features: FeatureVector = {};

  // Name similarity
  const nameA = extractName(a);
  const nameB = extractName(b);
  if (nameA && nameB) {
    features.nameSimilarity = jaroWinklerSimilarity(
      normalizeName(nameA),
      normalizeName(nameB)
    );
  }

  // Email similarity
  const emailA = extractEmail(a);
  const emailB = extractEmail(b);
  if (emailA && emailB) {
    features.emailSimilarity = normalizeEmail(emailA) === normalizeEmail(emailB) ? 1.0 : 0.0;
  }

  // Organization similarity
  const orgA = extractOrg(a);
  const orgB = extractOrg(b);
  if (orgA && orgB) {
    features.orgSimilarity = jaroWinklerSimilarity(
      normalizeOrg(orgA),
      normalizeOrg(orgB)
    );
  }

  // Geographic proximity
  const locA = extractLocation(a);
  const locB = extractLocation(b);
  if (locA && locB) {
    features.geoProximityKm = geoDistanceKm(locA, locB);
  }

  // Temporal overlap
  const periodA = extractTimePeriod(a);
  const periodB = extractTimePeriod(b);
  if (periodA && periodB) {
    features.temporalOverlapScore = temporalOverlapScore(periodA, periodB);
  }

  // Shared identifiers
  const idsA = extractIdentifiers(a);
  const idsB = extractIdentifiers(b);
  if (idsA && idsB) {
    features.sharedIdentifiersCount = sharedIdentifiersCount(idsA, idsB);
  }

  return features;
}

/**
 * Extract name from entity attributes
 * Tries multiple common attribute names
 */
function extractName(entity: EntityRecord): string | null {
  const attrs = entity.attributes;
  return (
    attrs.name ||
    attrs.fullName ||
    attrs.full_name ||
    attrs.displayName ||
    attrs.display_name ||
    (attrs.firstName && attrs.lastName ? `${attrs.firstName} ${attrs.lastName}` : null) ||
    (attrs.first_name && attrs.last_name ? `${attrs.first_name} ${attrs.last_name}` : null) ||
    null
  );
}

/**
 * Extract email from entity attributes
 */
function extractEmail(entity: EntityRecord): string | null {
  const attrs = entity.attributes;
  const email = attrs.email || attrs.emailAddress || attrs.email_address;

  // Handle email arrays (take first)
  if (Array.isArray(email)) {
    return email.length > 0 ? email[0] : null;
  }

  return email || null;
}

/**
 * Extract organization from entity attributes
 */
function extractOrg(entity: EntityRecord): string | null {
  const attrs = entity.attributes;
  return (
    attrs.organization ||
    attrs.org ||
    attrs.employer ||
    attrs.company ||
    attrs.orgName ||
    attrs.org_name ||
    null
  );
}

/**
 * Extract location from entity attributes
 */
function extractLocation(
  entity: EntityRecord
): { latitude: number; longitude: number } | null {
  const attrs = entity.attributes;

  // Try coordinates object
  if (attrs.coordinates) {
    const { lat, latitude, lng, longitude, lon } = attrs.coordinates;
    const latVal = lat ?? latitude;
    const lngVal = lng ?? longitude ?? lon;
    if (typeof latVal === 'number' && typeof lngVal === 'number') {
      return { latitude: latVal, longitude: lngVal };
    }
  }

  // Try location object
  if (attrs.location) {
    const { lat, latitude, lng, longitude, lon } = attrs.location;
    const latVal = lat ?? latitude;
    const lngVal = lng ?? longitude ?? lon;
    if (typeof latVal === 'number' && typeof lngVal === 'number') {
      return { latitude: latVal, longitude: lngVal };
    }
  }

  // Try top-level lat/long
  const latVal = attrs.lat ?? attrs.latitude;
  const lngVal = attrs.lng ?? attrs.longitude ?? attrs.lon;
  if (typeof latVal === 'number' && typeof lngVal === 'number') {
    return { latitude: latVal, longitude: lngVal };
  }

  return null;
}

/**
 * Extract time period from entity attributes
 */
function extractTimePeriod(
  entity: EntityRecord
): { start?: string; end?: string } | null {
  const attrs = entity.attributes;

  const start =
    attrs.activeFrom ||
    attrs.active_from ||
    attrs.startDate ||
    attrs.start_date ||
    attrs.validFrom ||
    attrs.valid_from;

  const end =
    attrs.activeTo ||
    attrs.active_to ||
    attrs.endDate ||
    attrs.end_date ||
    attrs.validTo ||
    attrs.valid_to;

  if (!start && !end) return null;

  return {
    start: start || undefined,
    end: end || undefined,
  };
}

/**
 * Extract identifiers from entity attributes
 * Tries phone, SSN, national ID, account ID, device ID, etc.
 */
function extractIdentifiers(entity: EntityRecord): string[] | null {
  const attrs = entity.attributes;
  const ids: string[] = [];

  // Phone numbers
  const phone = attrs.phone || attrs.phoneNumber || attrs.phone_number;
  if (phone) {
    const normalized = normalizePhone(phone);
    if (normalized) ids.push(normalized);
  }

  // National IDs
  if (attrs.ssn) ids.push(attrs.ssn);
  if (attrs.nationalId) ids.push(attrs.nationalId);
  if (attrs.national_id) ids.push(attrs.national_id);
  if (attrs.taxId) ids.push(attrs.taxId);
  if (attrs.tax_id) ids.push(attrs.tax_id);

  // Account/Device IDs
  if (attrs.accountId) ids.push(attrs.accountId);
  if (attrs.account_id) ids.push(attrs.account_id);
  if (attrs.deviceId) ids.push(attrs.deviceId);
  if (attrs.device_id) ids.push(attrs.device_id);
  if (attrs.userId) ids.push(attrs.userId);
  if (attrs.user_id) ids.push(attrs.user_id);

  // Custom identifier fields
  if (attrs.identifiers && Array.isArray(attrs.identifiers)) {
    ids.push(...attrs.identifiers.map(String));
  }

  return ids.length > 0 ? ids : null;
}
