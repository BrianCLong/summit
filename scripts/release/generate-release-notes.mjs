#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { fileURLToPath } from 'url';

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

const argv = yargs(hideBin(process.argv))
  .option('tag', {
    type: 'string',
    description: 'The git tag to generate notes for.',
  })
  .option('output-file', {
    type: 'string',
    description: 'The file to write the release notes to.',
    default: 'RELEASE_NOTES.md',
  }).argv;

const TAG = argv.tag || process.env.TAG;
const OUTPUT_FILE = argv.outputFile;
const DIST_DIR = process.env.DIST_DIR || 'dist/release';
const EVIDENCE_DIR = 'evidence'; // In the release job, artifacts are here.

/**
 * Appends the security exceptions section to the release notes file.
 * @param {string} outputFile - The path to the release notes file.
 */
function appendSecurityExceptions(outputFile) {
  const summaryPath = path.join(process.cwd(), EVIDENCE_DIR, 'security-exceptions', 'summary.json');

  if (!fs.existsSync(summaryPath)) {
    console.log('No security exception summary found. Skipping.');
    return;
  }

  try {
    const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
    const activeExceptions = summary.valid || [];

    if (activeExceptions.length === 0) {
      console.log('No active security exceptions to add to release notes.');
      return;
    }

    let notesSection = '\n\n## ⚠️ Security Exceptions\n\n';
    notesSection += 'This release includes the following active security exceptions:\n\n';

    activeExceptions.forEach(ex => {
      notesSection += `- **${ex.id} (${ex.risk_rating})**: ${ex.description}\n`;
      notesSection += `  - **Owner:** ${ex.owner}\n`;
      notesSection += `  - **Expires:** ${ex.expires_on}\n`;
    });

    fs.appendFileSync(outputFile, notesSection);
    console.log(`Appended ${activeExceptions.length} active security exceptions to ${outputFile}.`);
  } catch (e) {
    console.error('Failed to process and append security exceptions:', e);
  }
}

function getLastTag(tag) {
  try {
    return execSync(`git describe --tags --abbrev=0 ${tag}^ 2>/dev/null`).toString().trim();
  } catch (e) {
    return '';
  }
}

function getGitRange(tag) {
  const lastTag = getLastTag(tag);
  return lastTag ? `${lastTag}..${tag}` : tag;
}

function generateGitNotes(tag) {
    const range = getGitRange(tag);
    const cmd = `git log --pretty=format:"- %s (%h) - %an" --no-merges "${range}"`;
    try {
        const notes = execSync(cmd).toString();
        const body = `## Changes\n\n${notes}`;
        return { notes: body, source: 'git-log', range };
    } catch (e) {
        console.error("Failed to generate git log notes");
        return { notes: "No release notes available.", source: 'git-failed', range: '' };
    }
}

function main() {
  if (!TAG) {
    console.error('Error: --tag argument or TAG environment variable is required.');
    process.exit(1);
  }

  console.log(`Generating release notes for ${TAG}...`);

  const date = new Date().toISOString().split('T')[0];
  let fullNotes = `# ${TAG} (${date})\n\n`;

  const { notes: gitNotes } = generateGitNotes(TAG);
  fullNotes += gitNotes;

  fs.writeFileSync(OUTPUT_FILE, fullNotes);

  console.log(`Base release notes written to ${OUTPUT_FILE}`);

  appendSecurityExceptions(OUTPUT_FILE);
}

// Only run main when executed directly
if (import.meta.url.startsWith('file:')) {
  const modulePath = fileURLToPath(import.meta.url);
  if (process.argv[1] === modulePath) {
    main();
  }
}
