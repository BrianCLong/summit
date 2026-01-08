#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { program } from 'commander';

const STABILIZATION_DIR = 'docs/releases/stabilization-evidence';
const TRACKER_FILE = 'docs/releases/MVP-4_GA_ISSUANCE_WORKSHEET.md';

program
  .version('1.0.0')
  .description('Stabilization Evidence Management Tool');

program
  .command('create')
  .description('Create an evidence stub for a given Issue ID')
  .requiredOption('--id <id>', 'Issue ID (e.g., ISS-001)')
  .action((options) => {
    const issueId = options.id;
    // Normalize path to use forward slashes for consistency in markdown links
    const filename = `EVIDENCE_${issueId}.md`;
    const filepath = path.join(STABILIZATION_DIR, filename);

    if (fs.existsSync(filepath)) {
      console.error(`Error: Evidence file ${filepath} already exists.`);
      process.exit(1);
    }

    // Try to read title and owner from tracker file
    let title = '<from tracker>';
    let owner = '<from tracker>';

    if (fs.existsSync(TRACKER_FILE)) {
      const trackerContent = fs.readFileSync(TRACKER_FILE, 'utf-8');
      const lines = trackerContent.split('\n');
      const issueLine = lines.find(line => line.includes(issueId));
      if (issueLine) {
        // Table format: | ID | Title | Priority | Status | Owner | Ticket | Evidence Link |
        const parts = issueLine.split('|').map(p => p.trim());
        if (parts.length >= 7) {
            title = parts[2] || title;
            owner = parts[5] || owner;
        }
      }
    }

    const template = `
# Stabilization Evidence: ${issueId}

*   **Item**: ${issueId}
*   **Title**: ${title}
*   **Owner**: ${owner}
*   **Ticket**: <URL>
*   **Target**: <SHA/PR>

## Verification

### Commands run
\`\`\`bash
# Paste commands here
\`\`\`

### Expected outputs
\`\`\`text
# Paste output summary here
\`\`\`

### CI run link(s)
*   [Link 1](...)

## Artifacts

*   Names of relevant artifacts (evidence bundle, triage pack, etc.)

## Acceptance criteria checklist

*   [ ] criterion 1
*   [ ] criterion 2
*   [ ] criterion 3

## Result

*   **Result**: FAIL
*   **Date**: YYYY-MM-DD
`;

    if (!fs.existsSync(STABILIZATION_DIR)) {
        fs.mkdirSync(STABILIZATION_DIR, { recursive: true });
    }

    fs.writeFileSync(filepath, template.trim());
    console.log(`Created evidence stub: ${filepath}`);
    console.log(`Don't forget to update ${TRACKER_FILE} with the link: stabilization-evidence/${filename}`);
  });

program
  .command('validate')
  .description('Validate that all DONE items have evidence')
  .action(() => {
    if (!fs.existsSync(TRACKER_FILE)) {
        console.error(`Tracker file not found: ${TRACKER_FILE}`);
        process.exit(1);
    }

    const trackerContent = fs.readFileSync(TRACKER_FILE, 'utf-8');
    const lines = trackerContent.split('\n');
    let hasError = false;
    let doneCount = 0;
    let missingEvidenceCount = 0;

    const report = [];
    report.push('# Stabilization Evidence Validation Report');
    report.push(`Date: ${new Date().toISOString()}`);
    report.push('');
    report.push('| ID | Status | Issues |');
    report.push('| :--- | :--- | :--- |');

    lines.forEach((line) => {
      // Check if line is a table row with ISS-
      if (line.includes('ISS-')) {
        const parts = line.split('|').map(p => p.trim());
        // | ID | Title | Priority | Status | Owner | Ticket | Evidence Link |
        // indices: 0="", 1=ID, 2=Title, 3=Priority, 4=Status, 5=Owner, 6=Ticket, 7=Evidence Link
        if (parts.length >= 8) {
            const id = parts[1];
            const status = parts[4];
            const evidenceLink = parts[7];

            if (status === 'DONE') {
                doneCount++;
                let issues = [];

                // 1. Check for link in tracker
                if (!evidenceLink || evidenceLink === '') {
                    issues.push('Missing link in tracker');
                }

                // 2. Check file existence
                let evidenceFile = '';
                if (evidenceLink) {
                    // Handle relative path from tracker location
                    // Tracker is in docs/releases/, link is relative to that?
                    // Usually "stabilization-evidence/EVIDENCE_....md"
                    const linkPath = path.join(path.dirname(TRACKER_FILE), evidenceLink);
                    if (!fs.existsSync(linkPath)) {
                        issues.push(`Evidence file missing at ${linkPath}`);
                    } else {
                         evidenceFile = linkPath;
                    }
                }

                // 3. Check file content for PASS
                if (evidenceFile) {
                    const content = fs.readFileSync(evidenceFile, 'utf-8');
                    // Check for "**Result**: PASS"
                    if (!content.match(/\*\*Result\*\*:\s*PASS/i)) {
                        issues.push('Evidence file does not record PASS');
                    }
                }

                if (issues.length > 0) {
                    hasError = true;
                    missingEvidenceCount++;
                    report.push(`| ${id} | FAIL | ${issues.join(', ')} |`);
                    console.error(`[FAIL] ${id}: ${issues.join(', ')}`);
                } else {
                     report.push(`| ${id} | PASS | OK |`);
                }
            }
        }
      }
    });

    report.push('');
    report.push(`**Summary**`);
    report.push(`*   Total DONE items: ${doneCount}`);
    report.push(`*   Missing/Invalid Evidence: ${missingEvidenceCount}`);

    const reportPath = 'artifacts/stabilization/evidence-validation.md';
    const artifactsDir = path.dirname(reportPath);
    if (!fs.existsSync(artifactsDir)) {
        fs.mkdirSync(artifactsDir, { recursive: true });
    }
    fs.writeFileSync(reportPath, report.join('\n'));

    if (hasError) {
        console.error('Validation FAILED. See report for details.');
        process.exit(1);
    } else {
        console.log('Validation PASSED.');
    }
  });

program.parse(process.argv);
