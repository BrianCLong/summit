#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

// Valid labels map to SemVer effects
const VALID_LABELS = {
  'major': 'major',
  'minor': 'minor',
  'patch': 'patch',
  'semver:major': 'major',
  'semver:minor': 'minor',
  'semver:patch': 'patch',
  'norelease': 'none',
  'documentation': 'none'
};

const WARN_ONLY = true; // Hardcoded for now as per requirements

interface PREvent {
  pull_request: {
    labels: { name: string }[];
    number: number;
    title: string;
  };
}

function main() {
  const eventPath = process.env.GITHUB_EVENT_PATH;

  // Fixture mode: if a file path is passed as argument, use it
  const fixturePath = process.argv[2];

  let prLabels: string[] = [];

  if (fixturePath) {
    // Read from fixture file (expected format: JSON array of strings or object mimicking PR event)
    try {
      const content = fs.readFileSync(fixturePath, 'utf8');
      const json = JSON.parse(content);
      if (Array.isArray(json)) {
        prLabels = json;
      } else if (json.pull_request && json.pull_request.labels) {
        prLabels = json.pull_request.labels.map((l: any) => l.name);
      } else {
        console.error('Invalid fixture format.');
        process.exit(1);
      }
    } catch (e) {
      console.error(`Error reading fixture: ${e.message}`);
      process.exit(1);
    }
  } else if (eventPath) {
    // Read from GitHub Event
    try {
      const content = fs.readFileSync(eventPath, 'utf8');
      const event: PREvent = JSON.parse(content);
      if (event.pull_request && event.pull_request.labels) {
        prLabels = event.pull_request.labels.map(l => l.name);
      } else {
        console.log('No pull_request found in event payload (not a PR event?). Exiting.');
        process.exit(0);
      }
    } catch (e) {
      console.error(`Error reading GITHUB_EVENT_PATH: ${e.message}`);
      // In warn-only mode, we shouldn't fail the build even if we can't read the event?
      // But this is a script error, so maybe we should.
      // Requirement says "warn-only mode" regarding the label check failing.
      process.exit(1);
    }
  } else {
    console.log('No GITHUB_EVENT_PATH or fixture argument provided.');
    console.log('Usage: check-semver-label.ts [fixture.json]');
    process.exit(1);
  }

  const foundLabels = prLabels.filter(label => Object.keys(VALID_LABELS).includes(label));

  if (foundLabels.length === 0) {
    const msg = `::warning::No valid SemVer label found. Please add one of: ${Object.keys(VALID_LABELS).join(', ')}`;
    console.log(msg);
    if (!WARN_ONLY) {
      process.exit(1);
    }
  } else if (foundLabels.length > 1) {
    const msg = `::warning::Multiple SemVer labels found (${foundLabels.join(', ')}). Please ensure only one is applied to avoid ambiguity.`;
    console.log(msg);
    if (!WARN_ONLY) {
      process.exit(1);
    }
  } else {
    console.log(`Success: Found valid SemVer label "${foundLabels[0]}" -> ${VALID_LABELS[foundLabels[0] as keyof typeof VALID_LABELS]}`);
  }

  process.exit(0);
}

main();
