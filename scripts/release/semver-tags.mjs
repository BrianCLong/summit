import { execSync } from 'node:child_process';

/**
 * Parses a tag string into a semver object.
 * Returns null if the tag doesn't match the supported formats.
 * Supported formats:
 * - GA: vX.Y.Z
 * - RC: vX.Y.Z-rc.N
 */
export function parseTag(tag) {
  // GA: vX.Y.Z
  const gaMatch = tag.match(/^v(\d+)\.(\d+)\.(\d+)$/);
  if (gaMatch) {
    return {
      raw: tag,
      major: parseInt(gaMatch[1], 10),
      minor: parseInt(gaMatch[2], 10),
      patch: parseInt(gaMatch[3], 10),
      channel: 'ga',
      rc: null
    };
  }

  // RC: vX.Y.Z-rc.N
  const rcMatch = tag.match(/^v(\d+)\.(\d+)\.(\d+)-rc\.(\d+)$/);
  if (rcMatch) {
    return {
      raw: tag,
      major: parseInt(rcMatch[1], 10),
      minor: parseInt(rcMatch[2], 10),
      patch: parseInt(rcMatch[3], 10),
      channel: 'rc',
      rc: parseInt(rcMatch[4], 10)
    };
  }

  return null;
}

/**
 * Compares two parsed semver objects.
 * Returns:
 * - positive if a > b
 * - negative if a < b
 * - 0 if equal
 */
export function compareTags(a, b) {
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  if (a.patch !== b.patch) return a.patch - b.patch;

  // Same X.Y.Z
  // GA > RC
  if (a.channel === 'ga' && b.channel === 'rc') return 1;
  if (a.channel === 'rc' && b.channel === 'ga') return -1;

  // Both RC: compare rc number
  if (a.channel === 'rc' && b.channel === 'rc') {
    return a.rc - b.rc;
  }

  return 0; // Both GA (shouldn't happen with unique tags)
}

/**
 * Lists all tags matching v* and returns sorted parsed objects.
 */
export function listSortedTags() {
  try {
    const output = execSync('git tag --list "v*"', { encoding: 'utf8' });
    const tags = output.trim().split('\n')
      .map(t => t.trim())
      .filter(t => t)
      .map(parseTag)
      .filter(t => t !== null)
      .sort(compareTags);
    return tags;
  } catch (error) {
    console.error('Error listing tags:', error);
    return [];
  }
}
