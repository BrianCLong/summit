#!/usr/bin/env node
/**
 * Automated API Changelog Generator
 *
 * Generates changelog entries from git commits affecting the API
 * MIT License - Copyright (c) 2025 IntelGraph
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CHANGELOG_PATH = path.join(__dirname, '../docs/api/CHANGELOG.md');

// Commit type to changelog category mapping
const CATEGORY_MAP = {
  feat: 'Added',
  fix: 'Fixed',
  docs: 'Documentation',
  perf: 'Performance',
  refactor: 'Changed',
  breaking: 'Breaking Changes',
  security: 'Security',
  deprecate: 'Deprecated',
  remove: 'Removed',
};

/**
 * Get git commits affecting API files since last tag
 */
function getAPICommits(since = null) {
  try {
    const sinceArg = since ? `${since}..HEAD` : '--all';
    const command = `git log ${sinceArg} --pretty=format:"%H|%s|%b" --no-merges -- openapi/ services/api/src/`;

    const output = execSync(command, { encoding: 'utf8' });

    if (!output.trim()) {
      return [];
    }

    return output
      .trim()
      .split('\n')
      .map((line) => {
        const [hash, subject, body] = line.split('|');
        return { hash, subject, body: body || '' };
      });
  } catch (error) {
    console.error('Error getting git commits:', error.message);
    return [];
  }
}

/**
 * Parse commit message to extract type and description
 */
function parseCommit(commit) {
  const conventionalCommitRegex = /^(\w+)(?:\(([^)]+)\))?(!)?:\s*(.+)$/;
  const match = commit.subject.match(conventionalCommitRegex);

  if (!match) {
    return {
      type: 'other',
      scope: null,
      breaking: false,
      description: commit.subject,
      hash: commit.hash,
    };
  }

  const [, type, scope, breaking, description] = match;

  return {
    type,
    scope: scope || null,
    breaking: !!breaking || commit.body.includes('BREAKING CHANGE'),
    description,
    hash: commit.hash,
    body: commit.body,
  };
}

/**
 * Group commits by category
 */
function groupCommits(commits) {
  const groups = {};

  for (const commit of commits) {
    const parsed = parseCommit(commit);
    const category = parsed.breaking
      ? 'Breaking Changes'
      : CATEGORY_MAP[parsed.type] || 'Other';

    if (!groups[category]) {
      groups[category] = [];
    }

    let entry = `- ${parsed.description}`;

    // Add scope if present
    if (parsed.scope) {
      entry = `- **${parsed.scope}**: ${parsed.description}`;
    }

    // Add commit hash reference
    entry += ` ([${parsed.hash.substring(0, 7)}])`;

    // Add breaking change details
    if (parsed.breaking && parsed.body) {
      const breakingMatch = parsed.body.match(/BREAKING CHANGE:\s*(.+)/);
      if (breakingMatch) {
        entry += `\n  - ${breakingMatch[1]}`;
      }
    }

    groups[category].push(entry);
  }

  return groups;
}

/**
 * Generate changelog section for a version
 */
function generateChangelogSection(version, date, commits) {
  const groups = groupCommits(commits);

  let section = `\n## [${version}] - ${date}\n`;

  const categoryOrder = [
    'Breaking Changes',
    'Security',
    'Added',
    'Changed',
    'Deprecated',
    'Removed',
    'Fixed',
    'Performance',
    'Documentation',
    'Other',
  ];

  for (const category of categoryOrder) {
    if (groups[category] && groups[category].length > 0) {
      section += `\n### ${category}\n\n`;
      section += groups[category].join('\n') + '\n';
    }
  }

  return section;
}

/**
 * Get the latest git tag
 */
function getLatestTag() {
  try {
    const tag = execSync('git describe --tags --abbrev=0', {
      encoding: 'utf8',
    }).trim();
    return tag;
  } catch (error) {
    return null;
  }
}

/**
 * Update changelog file
 */
function updateChangelog(newSection) {
  let changelog = fs.readFileSync(CHANGELOG_PATH, 'utf8');

  // Find the [Unreleased] section
  const unreleasedRegex = /## \[Unreleased\]/;
  const match = changelog.match(unreleasedRegex);

  if (match) {
    // Insert new section after [Unreleased]
    const insertIndex = match.index + match[0].length;
    changelog =
      changelog.slice(0, insertIndex) +
      '\n' +
      newSection +
      '\n---\n' +
      changelog.slice(insertIndex);
  } else {
    // Append to end
    changelog += '\n' + newSection;
  }

  fs.writeFileSync(CHANGELOG_PATH, changelog, 'utf8');
}

/**
 * Main function
 */
function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
API Changelog Generator

Usage:
  node generate-api-changelog.js [options]

Options:
  --version <version>  Version number for the changelog entry (default: Unreleased)
  --since <ref>        Git ref to generate changelog since (default: last tag)
  --dry-run            Print changelog without updating file
  --help, -h           Show this help message

Examples:
  # Generate changelog since last tag
  node generate-api-changelog.js

  # Generate changelog for specific version
  node generate-api-changelog.js --version 1.1.0

  # Preview without updating file
  node generate-api-changelog.js --dry-run
    `);
    process.exit(0);
  }

  const versionIndex = args.indexOf('--version');
  const version = versionIndex !== -1 ? args[versionIndex + 1] : 'Unreleased';

  const sinceIndex = args.indexOf('--since');
  const since = sinceIndex !== -1 ? args[sinceIndex + 1] : getLatestTag();

  const dryRun = args.includes('--dry-run');

  console.log('Generating API changelog...');
  console.log(`Version: ${version}`);
  console.log(`Since: ${since || 'beginning'}`);
  console.log('');

  const commits = getAPICommits(since);

  if (commits.length === 0) {
    console.log('No API-related commits found.');
    return;
  }

  console.log(`Found ${commits.length} API-related commits.`);

  const date = new Date().toISOString().split('T')[0];
  const section = generateChangelogSection(version, date, commits);

  console.log('\n--- Generated Changelog Section ---\n');
  console.log(section);
  console.log('\n--- End of Section ---\n');

  if (!dryRun) {
    updateChangelog(section);
    console.log(`✓ Changelog updated at ${CHANGELOG_PATH}`);
  } else {
    console.log('(Dry run - changelog not updated)');
  }
}

main();
