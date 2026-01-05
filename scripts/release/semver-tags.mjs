// scripts/release/semver-tags.mjs

/**
 * Parses a git tag into its components.
 * @param {string} tag - The git tag (e.g., "v1.2.3", "v1.2.3-rc.4").
 * @returns {{major: number, minor: number, patch: number, channel: 'ga' | 'rc', rc?: number}}
 */
export function parseTag(tag) {
  if (!tag.startsWith('v')) {
    throw new Error(`Invalid tag format: ${tag}. Must start with 'v'.`);
  }

  const tagWithoutV = tag.slice(1);
  const parts = tagWithoutV.split('-rc.');

  const [major, minor, patch] = parts[0].split('.').map(Number);

  if (isNaN(major) || isNaN(minor) || isNaN(patch)) {
    throw new Error(`Invalid tag format: ${tag}. Could not parse version numbers.`);
  }

  if (parts.length > 1) {
    const rc = Number(parts[1]);
    if (isNaN(rc)) {
      throw new Error(`Invalid tag format: ${tag}. Could not parse RC number.`);
    }
    return { major, minor, patch, channel: 'rc', rc };
  }

  return { major, minor, patch, channel: 'ga' };
}

/**
 * Compares two tags for semantic versioning order.
 * @param {string} a - The first tag.
 * @param {string} b - The second tag.
 * @returns {number} -1 if a < b, 0 if a === b, 1 if a > b.
 */
export function compareTags(a, b) {
  const tagA = parseTag(a);
  const tagB = parseTag(b);

  if (tagA.major !== tagB.major) {
    return tagA.major > tagB.major ? 1 : -1;
  }
  if (tagA.minor !== tagB.minor) {
    return tagA.minor > tagB.minor ? 1 : -1;
  }
  if (tagA.patch !== tagB.patch) {
    return tagA.patch > tagB.patch ? 1 : -1;
  }

  // GA release is > than RC release
  if (tagA.channel === 'ga' && tagB.channel === 'rc') {
    return 1;
  }
  if (tagA.channel === 'rc' && tagB.channel === 'ga') {
    return -1;
  }

  if (tagA.channel === 'rc' && tagB.channel === 'rc') {
    if (tagA.rc !== tagB.rc) {
      return tagA.rc > tagB.rc ? 1 : -1;
    }
  }

  return 0;
}
