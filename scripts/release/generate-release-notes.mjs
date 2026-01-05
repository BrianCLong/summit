// scripts/release/generate-release-notes.mjs

/**
 * Groups commits by their conventional commit type.
 * @param {Array<{subject: string, body: string, hash: string}>} commits - A list of commits.
 * @returns {object} An object with keys for each commit type.
 */
export function groupCommits(commits) {
  const groups = {
    'Breaking Changes': [],
    'Features': [],
    'Fixes': [],
    'Other': [],
  };

  for (const commit of commits) {
    const { subject } = commit;
    if (subject.includes('!:')) {
      groups['Breaking Changes'].push(commit);
    } else if (subject.startsWith('feat:')) {
      groups['Features'].push(commit);
    } else if (subject.startsWith('fix:')) {
      groups['Fixes'].push(commit);
    } else {
      groups['Other'].push(commit);
    }
  }

  return groups;
}
