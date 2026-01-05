import { execSync } from 'child_process';

export function parseTag(tag) {
  // Regex: v(\d+)\.(\d+)\.(\d+)(?:-rc\.(\d+))?
  const match = tag.match(/^v(\d+)\.(\d+)\.(\d+)(?:-rc\.(\d+))?$/);
  if (!match) return null;
  return {
    original: tag,
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
    rc: match[4] ? parseInt(match[4], 10) : null,
    isGa: !match[4]
  };
}

export function compareTags(a, b) {
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  if (a.patch !== b.patch) return a.patch - b.patch;

  // Versions are same X.Y.Z
  // GA > RC.
  // If a is GA and b is RC, a > b (return 1).
  if (a.isGa && !b.isGa) return 1;
  // If a is RC and b is GA, a < b (return -1).
  if (!a.isGa && b.isGa) return -1;
  // If both GA, they are equal (return 0).
  if (a.isGa && b.isGa) return 0;

  // Both RC: compare rc number
  return a.rc - b.rc;
}

export function getTagsFromOutput(output) {
    return output
      .split('\n')
      .map(t => t.trim())
      .filter(t => t)
      .map(parseTag)
      .filter(t => t) // Filter out invalid/non-matching tags
      .sort(compareTags);
}

export function getSortedTags() {
  try {
    const output = execSync('git tag --list "v*"', { encoding: 'utf8' });
    return getTagsFromOutput(output);
  } catch (e) {
    console.error("Failed to list tags", e);
    return [];
  }
}
