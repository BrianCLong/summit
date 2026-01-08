#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../../');
const CONTROL_REGISTRY_PATH = path.join(ROOT, 'docs/compliance/CONTROL_REGISTRY.md');
const EVIDENCE_INDEX_PATH = path.join(ROOT, 'docs/compliance/EVIDENCE_INDEX.md');

// Helper to clean markdown table cell content
function cleanCell(cell) {
  if (!cell) return '';
  // Remove markdown formatting like **, ``, and leading/trailing whitespace/commas
  return cell.replace(/[`*]/g, '').trim().replace(/,$/, '');
}

function main() {
  console.log('Running compliance lints...');

  const registryContent = fs.readFileSync(CONTROL_REGISTRY_PATH, 'utf-8');
  const evidenceContent = fs.readFileSync(EVIDENCE_INDEX_PATH, 'utf-8');

  // Parse tables and clean data immediately
  const registryRows = parseMarkdownTable(registryContent);
  const evidenceRows = parseMarkdownTable(evidenceContent);

  const controlIdsInRegistry = new Set(registryRows.map(row => cleanCell(row['Control ID'])));
  const controlIdsInEvidence = evidenceRows.map(row => cleanCell(row['Control ID']));

  let errors = 0;

  // Check 1: Evidence Index references existing Control IDs
  console.log('\nChecking if Control IDs in EVIDENCE_INDEX exist in CONTROL_REGISTRY...');
  for (const id of controlIdsInEvidence) {
    if (id && !controlIdsInRegistry.has(id)) {
      console.error(`[ERROR] Control ID "${id}" from EVIDENCE_INDEX.md not found in CONTROL_REGISTRY.md`);
      errors++;
    }
  }

  console.log('\nChecking paths in CONTROL_REGISTRY...');
  for (const row of registryRows) {
    const controlId = cleanCell(row['Control ID']);
    if (!controlId) continue;

    // Check 2: Verification commands point to existing files
    const command = cleanCell(row['Verification']);
    if (command) {
        const commandParts = command.split(' ');
        const fileToCheck = commandParts[commandParts.length - 1];

        if (fileToCheck.includes('/') || fileToCheck.includes('.')) {
          if (!command.startsWith('grep') && !command.startsWith('ls') && !command.startsWith('make') && !command.startsWith('pnpm')) {
            const filePath = path.join(ROOT, fileToCheck);
            if (!fs.existsSync(filePath)) {
              console.error(`[ERROR] [${controlId}] Verification command in CONTROL_REGISTRY.md points to a non-existent file: "${fileToCheck}"`);
              errors++;
            }
          }
        }
    }

    // Check 3: Evidence paths point to existing files (if not generated)
    const evidencePathsRaw = cleanCell(row['Evidence']);
    if (evidencePathsRaw) {
        const evidencePaths = evidencePathsRaw.split(',').map(p => p.trim());
        for (const evidencePath of evidencePaths) {
            if (!evidencePath || evidencePath.toLowerCase().includes('log') || evidencePath.startsWith('artifacts/') || evidencePath.startsWith('dist/') || evidencePath.toLowerCase().includes('source code') || evidencePath.toLowerCase().includes('infrastructure as code') || evidencePath.toLowerCase().includes('configuration')) {
                continue;
            }

            const fullPath = path.join(ROOT, evidencePath);
            if (evidencePath.includes('/') || evidencePath.includes('.')) {
                if (!fs.existsSync(fullPath) && !evidencePath.endsWith('/')) { // Don't check directories yet
                    console.error(`[ERROR] [${controlId}] Evidence path in CONTROL_REGISTRY.md points to a non-existent file: "${evidencePath}"`);
                    errors++;
                }
            }
        }
    }
  }


  if (errors > 0) {
    console.error(`\nFound ${errors} compliance linting error(s).`);
    process.exit(1);
  } else {
    console.log('\nAll compliance lints passed.');
  }
}

function parseMarkdownTable(markdown) {
    const lines = markdown.split('\n');
    const result = [];
    let header = [];
    let headerParsed = false;
    let separatorParsed = false;

    for (const line of lines) {
        if (!line.includes('|')) {
            if (headerParsed) break;
            continue;
        }

        const cells = line.split('|').map(cell => cell.trim());
        if (!headerParsed) {
            header = cells;
            headerParsed = true;
        } else if (!separatorParsed) {
            separatorParsed = true;
        } else {
            const row = {};
            header.forEach((col, index) => {
                const cleanCol = col.replace(/\*\*/g, '').trim();
                if(cleanCol){
                    row[cleanCol] = cells[index];
                }
            });
            if (Object.keys(row).length > 0 && cells.length > 1 && cells[1].trim() !== '') {
               result.push(row);
            }
        }
    }
    return result;
}

main();
