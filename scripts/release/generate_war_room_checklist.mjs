#!/usr/bin/env node

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, resolve } from 'path';
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';

// Helper function to safely read a JSON file
function readJsonFile(filePath) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.warn(`Could not read or parse JSON file: ${filePath}`);
    return null;
  }
}

// Helper function to safely read a text file
function readTextFile(filePath) {
  try {
    return readFileSync(filePath, 'utf-8');
  } catch (error) {
    console.warn(`Could not read text file: ${filePath}`);
    return null;
  }
}

async function main() {
  const argv = yargs(hideBin(process.argv))
    .option('channel', {
      describe: 'Release channel',
      choices: ['rc', 'ga'],
      demandOption: true,
    })
    .option('target', {
      describe: 'Git SHA, tag, or branch to target',
      type: 'string',
      demandOption: true,
    })
    .option('out', {
        describe: 'Output file path',
        type: 'string',
        demandOption: true,
    })
    .parse();

  const { channel, target, out } = argv;

  // --- 1. Resolve Inputs ---
  const targetSha = execSync(`git rev-parse ${target}`).toString().trim();
  const generationDate = new Date().toISOString();

  // --- 2. Load Source-of-Truth Artifacts ---
  const decision = readJsonFile('artifacts/signoff/decision.json') || { status: 'UNKNOWN', reason: 'File not found' };
  const onePager = readTextFile('artifacts/release-readiness/onepager.md') || 'One-pager not found.';
  const cutPlan = readTextFile('artifacts/release-cut/plan.md') || 'Cut plan not found.';

  const isEligible = decision.status === 'ELIGIBLE';

  // --- 3. Generate Checklist Sections ---

  const header = `
# Release War Room Checklist
| Channel | Target | Target SHA | Generated |
| :--- | :--- | :--- | :--- |
| **${channel.toUpperCase()}** | \`${target}\` | \`${targetSha.substring(0, 12)}\` | ${generationDate} |
| **Meeting Date:** | *YYYY-MM-DD HH:mm UTC* | | |
`;

  const roles = `
## B) Roles & Responsibilities
| Role | Name | Notes |
| :--- | :--- | :--- |
| **Release Lead** | | The Decider. Coordinates all activities. |
| **Scribe** | | Takes notes, updates status. |
| **CI Operator** | | Executes commands, monitors CI/CD pipeline. |
| **Infra/Deploy** | | Monitors infrastructure, manages deployment. |
| **Security** | | Monitors security alerts. |
`;

  const preconditions = `
## C) Preconditions
${!isEligible ? `> **[!WARNING]**\n> **HARD STOP:** The sign-off decision is **${decision.status}**. This release is NOT ELIGIBLE.\n> Reason: *${decision.reason}*` : ''}
- [${isEligible ? 'x' : ' '}] **Sign-off Decision is ELIGIBLE**: Path: \`artifacts/signoff/decision.json\`
- [ ] **Release Policy Verified**: No active freeze windows.
- [ ] **Rollback Plan Reviewed**: See \`docs/releases/ROLLBACK.md\`.
`;

  const agenda = `
## D) Agenda
| Time | Step | Owner | Status |
| :--- | :--- | :--- | :--- |
| **T-15** | Assemble & Review Checklist | Release Lead | [ ] Done |
| **T-10** | Final Go/No-Go Decision | Release Lead | [ ] Done |
| **T-5**  | Announce start in status channel | Scribe | [ ] Done |
| **T0**   | **BEGIN EXECUTION** | CI Operator | |
| **T+15** | Post-Release Verification | Infra/Deploy | [ ] Done |
| **T+60** | All Clear / Stand Down | Release Lead | [ ] Done |
`;

  const executionScript = `
## E) Execution Script

This script is sourced from \`artifacts/release-cut/plan.md\`.

---
${cutPlan}
---
`;

  const stopCriteria = `
## F) Stop / Rollback Criteria
**If any of the following occur, STOP the release and consult \`docs/releases/ROLLBACK.md\`:**
- Critical CI job fails (e.g., build, deploy).
- P0 alerts fire post-deployment.
- Manual verification step fails.
`;

  const evidenceIndex = `
## G) Evidence Index
- **Sign-off Decision:** \`artifacts/signoff/decision.json\`
- **Release Readiness One-Pager:** \`artifacts/release-readiness/onepager.md\`
- **Release Cut Plan:** \`artifacts/release-cut/plan.md\`
- **Evidence Bundle:** Attached to the GitHub Release.
`;


  // --- 4. Assemble and Write ---
  const checklistContent = [
    header,
    roles,
    preconditions,
    agenda,
    executionScript,
    stopCriteria,
    evidenceIndex
  ].join('\\n---\\n');

  const outDir = dirname(out);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(out, checklistContent);

  console.log(`✅ War Room Checklist generated at: ${out}`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
