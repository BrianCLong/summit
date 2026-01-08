// scripts/release/find-prev-tag.mjs

import { compareTags, parseTag } from "./semver-tags.mjs";

/**
 * Finds the previous tag from a list of all tags.
 * @param {string} currentTag - The tag for which to find the previous version.
 * @param {string[]} allTags - A list of all tags in the repository.
 * @returns {string | null} The previous tag, or null if not found.
 */
export function findPreviousTag(currentTag, allTags) {
  const parsedCurrentTag = parseTag(currentTag);
  const sortedTags = [...allTags].sort(compareTags);
  const currentIndex = sortedTags.indexOf(currentTag);

  if (currentIndex === -1) {
    throw new Error("Current tag not found in the list of all tags.");
  }

  if (currentIndex === 0) {
    return null;
  }

  // If the current tag is an RC, the previous tag is simply the one before it in the sorted list.
  if (parsedCurrentTag.channel === "rc") {
    return sortedTags[currentIndex - 1];
  }

  // If the current tag is a GA release, we need to find the most recent GA tag before it,
  // ignoring any RCs for the current version.
  if (parsedCurrentTag.channel === "ga") {
    const previousTags = sortedTags.slice(0, currentIndex);
    for (let i = previousTags.length - 1; i >= 0; i--) {
      const tag = previousTags[i];
      const parsedTag = parseTag(tag);
      if (parsedTag.channel === "ga") {
        return tag;
      }
    }
  }

  return null; // No previous GA tag found
}
