/**
 * Entity Resolution Service - Blocking Strategy
 *
 * Blocking reduces O(N²) comparisons by grouping candidates with shared keys
 */

import { EntityRecord } from '../domain/EntityRecord.js';
import { normalizeName, normalizeEmail } from '../features/normalization.js';

/**
 * Blocking key for candidate generation
 */
export interface BlockingKey {
  key: string;
}

/**
 * Compute blocking keys for an entity record
 * Records are only compared if they share at least one blocking key
 */
export function computeBlockingKeys(record: EntityRecord): BlockingKey[] {
  const keys: BlockingKey[] = [];

  // Email domain blocking
  const email = extractEmail(record);
  if (email) {
    const normalized = normalizeEmail(email);
    const domain = normalized.split('@')[1];
    if (domain) {
      keys.push({ key: `email_domain:${domain}` });
    }
  }

  // Name + Country blocking (for international datasets)
  const name = extractName(record);
  const country = extractCountry(record);
  if (name && country) {
    const lastName = extractLastName(name);
    if (lastName) {
      keys.push({ key: `name_country:${lastName}:${country}` });
    }
  }

  // Phone prefix blocking (country code)
  const phone = extractPhone(record);
  if (phone) {
    const prefix = phone.substring(0, 4); // e.g., +1-5
    if (prefix.length >= 2) {
      keys.push({ key: `phone_prefix:${prefix}` });
    }
  }

  // Organization blocking
  const org = extractOrg(record);
  if (org) {
    const normalized = org.toLowerCase().trim().substring(0, 10);
    if (normalized) {
      keys.push({ key: `org:${normalized}` });
    }
  }

  // Fallback: If no blocking keys, use entity type
  if (keys.length === 0) {
    keys.push({ key: `type:${record.entityType}` });
  }

  return keys;
}

/**
 * Group records by blocking keys
 * Returns a map of blocking key -> record IDs
 */
export function groupByBlockingKeys(
  records: EntityRecord[]
): Map<string, string[]> {
  const groups = new Map<string, string[]>();

  for (const record of records) {
    const blockingKeys = computeBlockingKeys(record);

    for (const { key } of blockingKeys) {
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(record.id);
    }
  }

  return groups;
}

/**
 * Find candidate pairs that share blocking keys
 * Returns array of [recordIdA, recordIdB] pairs
 */
export function findCandidatePairs(
  records: EntityRecord[]
): Array<[string, string]> {
  const groups = groupByBlockingKeys(records);
  const pairs = new Set<string>();

  for (const recordIds of groups.values()) {
    if (recordIds.length < 2) continue;

    // Generate all pairs within this block
    for (let i = 0; i < recordIds.length; i++) {
      for (let j = i + 1; j < recordIds.length; j++) {
        const idA = recordIds[i];
        const idB = recordIds[j];

        // Create a deterministic pair key
        const pairKey = idA < idB ? `${idA}:${idB}` : `${idB}:${idA}`;
        pairs.add(pairKey);
      }
    }
  }

  // Convert back to tuples
  return Array.from(pairs).map((pairKey) => {
    const [idA, idB] = pairKey.split(':');
    return [idA, idB] as [string, string];
  });
}

// Helper functions to extract attributes

function extractEmail(record: EntityRecord): string | null {
  const attrs = record.attributes;
  const email = attrs.email || attrs.emailAddress || attrs.email_address;
  if (Array.isArray(email)) {
    return email.length > 0 ? email[0] : null;
  }
  return email || null;
}

function extractName(record: EntityRecord): string | null {
  const attrs = record.attributes;
  return (
    attrs.name ||
    attrs.fullName ||
    attrs.full_name ||
    (attrs.firstName && attrs.lastName ? `${attrs.firstName} ${attrs.lastName}` : null) ||
    (attrs.first_name && attrs.last_name ? `${attrs.first_name} ${attrs.last_name}` : null) ||
    null
  );
}

function extractLastName(fullName: string): string | null {
  const parts = fullName.trim().split(/\s+/);
  return parts.length > 0 ? normalizeName(parts[parts.length - 1]) : null;
}

function extractCountry(record: EntityRecord): string | null {
  const attrs = record.attributes;
  return (
    attrs.country ||
    attrs.countryCode ||
    attrs.country_code ||
    attrs.location?.country ||
    attrs.address?.country ||
    null
  )?.toString().toLowerCase();
}

function extractPhone(record: EntityRecord): string | null {
  const attrs = record.attributes;
  const phone = attrs.phone || attrs.phoneNumber || attrs.phone_number;
  return phone || null;
}

function extractOrg(record: EntityRecord): string | null {
  const attrs = record.attributes;
  return (
    attrs.organization ||
    attrs.org ||
    attrs.employer ||
    attrs.company ||
    null
  );
}
