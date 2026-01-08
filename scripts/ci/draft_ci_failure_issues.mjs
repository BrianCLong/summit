#!/usr/bin/env node

import fs from 'fs';
import yaml from 'js-yaml';
import path from 'path';
import { minimatch } from 'minimatch';

// --- Configuration ---
const FAILURE_OWNERS_PATH = path.join(process.cwd(), 'docs/ci/FAILURE_OWNERS.yml');
const CI_FAILURES_PATH = process.env.CI_FAILURES_PATH || path.join(process.cwd(), 'artifacts/ci-issues/failures.json');
const OUTPUT_DIR = path.join(process.cwd(), 'artifacts/ci-issues');

// --- Helper Functions ---

function loadOwners() {
  if (!fs.existsSync(FAILURE_OWNERS_PATH)) {
    throw new Error(`${FAILURE_OWNERS_PATH} not found.`);
  }
  return yaml.load(fs.readFileSync(FAILURE_OWNERS_PATH, 'utf8'));
}

function resolveOwner(failure, ownersConfig) {
  const defaults = ownersConfig.defaults;
  const owners = ownersConfig.owners || [];

  let bestMatch = null;
  let matchType = null; // 'code', 'category_workflow', 'path'

  // Resolution rules:
  // 1. failure_code match
  // 2. category + workflow match
  // 3. path match
  // If multiple matches tie: choose the first in file order

  for (const owner of owners) {
    const matches = owner.matches || {};

    // 1. Failure Code Match
    if (matches.failure_codes && failure.code && matches.failure_codes.includes(failure.code)) {
      if (matchType !== 'code') {
         // Code match is highest priority.
         bestMatch = owner;
         matchType = 'code';
      }
      // If we already have a code match, we stick with the first one found (file order).
    }

    // If we already have a code match, skip lower priority checks for this owner
    if (matchType === 'code') continue;

    // 2. Category + Workflow Match
    if (matches.categories && matches.workflows && failure.category && failure.workflow) {
        if (matches.categories.includes(failure.category) && matches.workflows.includes(failure.workflow)) {
            if (matchType !== 'category_workflow') {
                bestMatch = owner;
                matchType = 'category_workflow';
            }
        }
    }

    if (matchType === 'category_workflow') continue;


    // 3. Path Match
    if (matches.paths && failure.paths && failure.paths.length > 0) {
        // Check if ANY of the failure paths match ANY of the owner paths
        const hasPathMatch = matches.paths.some(ownerPath =>
            failure.paths.some(failPath => minimatch(failPath, ownerPath))
        );

        if (hasPathMatch) {
            if (matchType !== 'path') {
                bestMatch = owner;
                matchType = 'path';
            }
        }
    }
  }

  if (bestMatch) {
      return {
          owner: bestMatch,
          matchType: matchType,
          triageLabel: null,
          ownerLabels: bestMatch.labels || [],
          mentions: bestMatch.github || []
      };
  }

  return {
      owner: null,
      matchType: null,
      triageLabel: defaults.triage_label,
      ownerLabels: [],
      mentions: []
  };
}

function draftIssues() {
  console.log('Starting CI Failure Issue Drafting...');

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  let ownersConfig;
  try {
      ownersConfig = loadOwners();
  } catch (e) {
      console.error(`Failed to load owners: ${e.message}`);
      process.exit(1);
  }

  let failures = [];
  if (fs.existsSync(CI_FAILURES_PATH)) {
      try {
          failures = JSON.parse(fs.readFileSync(CI_FAILURES_PATH, 'utf8'));
      } catch (e) {
          console.error(`Failed to parse failures file: ${e.message}`);
          process.exit(1);
      }
  } else {
      console.warn(`No failures file found at ${CI_FAILURES_PATH}. Assuming no failures.`);
  }

  const draftedIssues = failures.map(failure => {
      const resolution = resolveOwner(failure, ownersConfig);

      const labels = ['ci-failure'];
      if (failure.category) labels.push(`ci/${failure.category}`);
      if (failure.severity) labels.push(`ci/${failure.severity}`); // e.g., ci/p0

      if (resolution.triageLabel) {
          labels.push(resolution.triageLabel);
      }
      if (resolution.ownerLabels) {
          labels.push(...resolution.ownerLabels);
      }

      let bodySection = `\n\n## Owner Routing\n`;
      if (resolution.owner) {
          bodySection += `Routed to: ${resolution.mentions.join(' ')} (mapping ${resolution.owner.id})\n`;
          bodySection += `Match type: ${resolution.matchType}`;
      } else {
          bodySection += `No owner mapping found; routed to ${resolution.triageLabel}`;
      }

      return {
          ...failure,
          routing: resolution,
          applied_labels: labels,
          body_addition: bodySection
      };
  });

  const jsonOutputPath = path.join(OUTPUT_DIR, 'routed_failures.json');
  fs.writeFileSync(jsonOutputPath, JSON.stringify(draftedIssues, null, 2));
  console.log(`Drafted ${draftedIssues.length} issues to ${jsonOutputPath}`);

  // Generate Markdown Output
  let markdownOutput = `# CI Routed Failures Draft\n\n`;
  markdownOutput += `Date: ${new Date().toISOString()}\n\n`;

  draftedIssues.forEach((issue, index) => {
      markdownOutput += `### Issue ${index + 1}: ${issue.code || 'Unknown Code'}\n\n`;
      markdownOutput += `**Labels:** ${issue.applied_labels.join(', ')}\n`;
      markdownOutput += `\n**Body Content:**\n`;
      markdownOutput += issue.body_addition + '\n\n';
      markdownOutput += `\n---\n\n`;
  });

  const mdOutputPath = path.join(OUTPUT_DIR, 'routed_failures.md');
  fs.writeFileSync(mdOutputPath, markdownOutput);
  console.log(`Drafted markdown to ${mdOutputPath}`);
}

draftIssues();
