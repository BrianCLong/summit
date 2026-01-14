import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { program } from 'commander';

const GOVERNANCE_DIR = path.join(process.cwd(), 'docs/governance');
const INDEX_FILE = path.join(GOVERNANCE_DIR, 'INDEX.yml');

// Helper to calculate SHA256 of a file
function calculateChecksum(filePath: string): string {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

// Helper to get all files in a directory recursively
function getFiles(dir: string): string[] {
  let results: string[] = [];
  if (!fs.existsSync(dir)) {
    return results;
  }
  const list = fs.readdirSync(dir);

  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat && stat.isDirectory()) {
      results = results.concat(getFiles(filePath));
    } else {
      // Exclude INDEX.yml itself and any hidden files
      if (filePath !== INDEX_FILE && !path.basename(filePath).startsWith('.')) {
        results.push(filePath);
      }
    }
  }
  return results;
}

interface IndexEntry {
  file: string;
  hash: string;
}

function parseIndex(content: string): Record<string, string> {
  const lines = content.split('\n');
  const index: Record<string, string> = {};

  for (const line of lines) {
    const match = line.match(/^(.+):\s+([a-f0-9]+)$/);
    if (match) {
      index[match[1]] = match[2];
    }
  }
  return index;
}

function generateIndexContent(entries: IndexEntry[]): string {
  // Sort by filename for determinism
  entries.sort((a, b) => a.file.localeCompare(b.file));

  const header = "# Governance Documentation Integrity Index\n# DO NOT EDIT MANUALLY. Run 'pnpm check:governance:integrity --fix' to update.\n\n";
  const body = entries.map(e => `${e.file}: ${e.hash}`).join('\n');
  return header + body;
}

async function main() {
  program
    .option('--fix', 'Update the INDEX.yml file')
    .parse(process.argv);

  const options = program.opts();
  const shouldFix = !!options.fix;

  if (!fs.existsSync(GOVERNANCE_DIR)) {
    console.error(`Governance directory not found: ${GOVERNANCE_DIR}`);
    process.exit(1);
  }

  const files = getFiles(GOVERNANCE_DIR);
  const currentEntries: IndexEntry[] = files.map(filePath => {
    const relativePath = path.relative(GOVERNANCE_DIR, filePath).replace(/\\/g, '/');
    return {
      file: relativePath,
      hash: calculateChecksum(filePath)
    };
  });

  if (shouldFix) {
    const content = generateIndexContent(currentEntries);
    fs.writeFileSync(INDEX_FILE, content);
    console.log(`Updated ${INDEX_FILE}`);
    process.exit(0);
  }

  if (!fs.existsSync(INDEX_FILE)) {
    console.error(`INDEX.yml not found in ${GOVERNANCE_DIR}. Run with --fix to generate it.`);
    process.exit(1);
  }

  const indexContent = fs.readFileSync(INDEX_FILE, 'utf-8');
  const expectedIndex = parseIndex(indexContent);

  const errors: string[] = [];

  // Check for modifications and missing files
  for (const entry of currentEntries) {
    const expectedHash = expectedIndex[entry.file];

    if (!expectedHash) {
      errors.push(`New file detected: ${entry.file}`);
    } else if (expectedHash !== entry.hash) {
      errors.push(`Hash mismatch for ${entry.file}. Expected ${expectedHash}, got ${entry.hash}`);
    }
  }

  // Check for deleted files
  const currentFilesSet = new Set(currentEntries.map(e => e.file));
  for (const file of Object.keys(expectedIndex)) {
    if (!currentFilesSet.has(file)) {
      errors.push(`File missing: ${file}`);
    }
  }

  if (errors.length > 0) {
    console.error('Governance Integrity Check Failed:');
    errors.forEach(e => console.error(`- ${e}`));
    console.error('\nRun with --fix to update the index.');
    process.exit(1);
  }

  console.log('Governance Integrity Check Passed.');
}

main().catch(console.error);
