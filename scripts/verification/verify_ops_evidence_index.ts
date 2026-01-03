import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DOCS_DIR = path.resolve(__dirname, '../../docs/ops');
const JSON_PATH = path.join(DOCS_DIR, 'EVIDENCE_INDEX.json');
const MD_PATH = path.join(DOCS_DIR, 'EVIDENCE_INDEX.md');

// ANSI Colors
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const RESET = '\x1b[0m';

function fail(message: string) {
  console.error(`${RED}FAIL: ${message}${RESET}`);
  process.exit(1);
}

function pass(message: string) {
  console.log(`${GREEN}PASS: ${message}${RESET}`);
}

interface EvidenceEntry {
  release_tag: string;
  commit_sha: string;
  generated_at_utc: string;
  evidence_pack_artifact: {
    type: 'workflow_artifact' | 'release_asset' | 'external_storage';
    identifier: string;
  };
  verification_status: 'pass' | 'fail' | 'partial';
  notes?: string;
  verifier_versions?: {
    node?: string;
    pnpm?: string;
    promtool?: string;
  };
}

function validateIso8601(dateStr: string): boolean {
  // Simple regex for ISO8601 UTC
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(dateStr);
}

function validateJson() {
  if (!fs.existsSync(JSON_PATH)) {
    fail(`JSON index not found at ${JSON_PATH}`);
  }

  let data: EvidenceEntry[];
  try {
    const raw = fs.readFileSync(JSON_PATH, 'utf-8');
    data = JSON.parse(raw);
  } catch (e) {
    fail(`Invalid JSON in ${JSON_PATH}: ${(e as Error).message}`);
    return; // make TS happy
  }

  if (!Array.isArray(data)) {
    fail('JSON root must be an array');
  }

  let lastDate: number | null = null;

  data.forEach((entry, idx) => {
    // Required fields
    if (!entry.release_tag) fail(`Entry ${idx} missing release_tag`);
    if (!entry.commit_sha) fail(`Entry ${idx} missing commit_sha`);
    if (!entry.generated_at_utc) fail(`Entry ${idx} missing generated_at_utc`);
    if (!validateIso8601(entry.generated_at_utc)) fail(`Entry ${idx} invalid ISO8601 date: ${entry.generated_at_utc}`);

    if (!entry.evidence_pack_artifact) fail(`Entry ${idx} missing evidence_pack_artifact`);
    if (!['workflow_artifact', 'release_asset', 'external_storage'].includes(entry.evidence_pack_artifact.type)) {
      fail(`Entry ${idx} invalid artifact type: ${entry.evidence_pack_artifact.type}`);
    }
    if (!entry.evidence_pack_artifact.identifier) fail(`Entry ${idx} missing artifact identifier`);

    if (!['pass', 'fail', 'partial'].includes(entry.verification_status)) {
      fail(`Entry ${idx} invalid verification_status: ${entry.verification_status}`);
    }

    // Ordering check (newest first)
    const currentDate = new Date(entry.generated_at_utc).getTime();
    if (lastDate !== null && currentDate > lastDate) {
      fail(`Entry ${idx} is out of order (must be newest first). ${entry.generated_at_utc} > previous entry.`);
    }
    lastDate = currentDate;
  });

  pass(`JSON index valid (${data.length} entries)`);
  return data;
}

function validateMd(jsonData: EvidenceEntry[]) {
  if (!fs.existsSync(MD_PATH)) {
    fail(`Markdown index not found at ${MD_PATH}`);
  }

  const content = fs.readFileSync(MD_PATH, 'utf-8');
  const lines = content.split('\n');

  // Find table start
  const tableHeaderIndex = lines.findIndex(l => l.includes('| Date (UTC) | Release/Tag |'));
  if (tableHeaderIndex === -1) {
    fail('Markdown table header not found');
  }

  // Start checking rows after header and separator
  const tableRows = lines.slice(tableHeaderIndex + 2).filter(l => l.trim().startsWith('|'));

  // Basic count check
  if (tableRows.length !== jsonData.length) {
    if (tableRows.length === 0 && jsonData.length === 0) {
        pass('Markdown table empty (consistent with JSON)');
        return;
    }
    fail(`Mismatch in entry count: JSON has ${jsonData.length}, MD table has ${tableRows.length}`);
  }

  tableRows.forEach((row, idx) => {
    const jsonEntry = jsonData[idx];
    const cells = row.split('|').map(c => c.trim()).filter(c => c !== '');

    // | Date (UTC) | Release/Tag | Commit | Status | Artifact Reference | Notes |
    // Cells: [Date, Tag, Commit, Status, Ref, Notes]

    if (cells.length < 5) fail(`MD Row ${idx} malformed`);

    // Verify key data points match
    // Check if the cell content matches the JSON date
    if (cells[0] !== jsonEntry.generated_at_utc) {
      // Also allow simple YYYY-MM-DD match if strict ISO is not used in MD for brevity
      if (!jsonEntry.generated_at_utc.startsWith(cells[0])) {
         fail(`MD Row ${idx} date mismatch: ${cells[0]} vs ${jsonEntry.generated_at_utc}`);
      }
    }

    if (cells[1] !== jsonEntry.release_tag) fail(`MD Row ${idx} tag mismatch: ${cells[1]} vs ${jsonEntry.release_tag}`);
    if (cells[3] !== jsonEntry.verification_status) fail(`MD Row ${idx} status mismatch: ${cells[3]} vs ${jsonEntry.verification_status}`);
  });

  pass('Markdown table consistent with JSON');
}

function main() {
  console.log('Verifying Ops Evidence Index...');
  const data = validateJson();
  if (data) {
    validateMd(data);
  }
}

main();
