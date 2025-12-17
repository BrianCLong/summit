/**
 * ID generation utilities for decision graph objects
 */

import { v4 as uuidv4, v5 as uuidv5 } from 'uuid';

// Namespace UUIDs for deterministic ID generation
const NAMESPACES = {
  entity: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
  claim: '6ba7b811-9dad-11d1-80b4-00c04fd430c8',
  evidence: '6ba7b812-9dad-11d1-80b4-00c04fd430c8',
  decision: '6ba7b813-9dad-11d1-80b4-00c04fd430c8',
  provenance: '6ba7b814-9dad-11d1-80b4-00c04fd430c8',
  relationship: '6ba7b815-9dad-11d1-80b4-00c04fd430c8',
  disclosure: '6ba7b816-9dad-11d1-80b4-00c04fd430c8',
} as const;

type ObjectType = keyof typeof NAMESPACES;

/**
 * Generate a new random UUID for an object type
 */
export function generateId(type: ObjectType): string {
  return `${type}_${uuidv4()}`;
}

/**
 * Generate a deterministic UUID based on content
 * Useful for deduplication and idempotent operations
 */
export function generateDeterministicId(
  type: ObjectType,
  content: string,
): string {
  const namespace = NAMESPACES[type];
  return `${type}_${uuidv5(content, namespace)}`;
}

/**
 * Parse an ID to extract type and UUID
 */
export function parseId(id: string): { type: string; uuid: string } | null {
  const match = id.match(/^([a-z]+)_([0-9a-f-]{36})$/);
  if (!match) return null;
  return { type: match[1], uuid: match[2] };
}

/**
 * Validate that an ID is well-formed
 */
export function isValidId(id: string, expectedType?: ObjectType): boolean {
  const parsed = parseId(id);
  if (!parsed) return false;
  if (expectedType && parsed.type !== expectedType) return false;
  return true;
}

/**
 * Generate a run ID for Maestro orchestration
 */
export function generateRunId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `run_${timestamp}_${random}`;
}

/**
 * Generate a version string
 */
export function generateVersion(major: number = 0, minor: number = 1, patch: number = 0): string {
  return `${major}.${minor}.${patch}`;
}

/**
 * Increment version
 */
export function incrementVersion(
  version: string,
  type: 'major' | 'minor' | 'patch' = 'patch',
): string {
  const [major, minor, patch] = version.split('.').map(Number);

  switch (type) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
    default:
      return `${major}.${minor}.${patch + 1}`;
  }
}
