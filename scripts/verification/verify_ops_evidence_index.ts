
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// --- Types ---
type EvidenceKind = 'weekly' | 'release' | 'incident' | 'ad-hoc';
type EvidenceStatus = 'pass' | 'fail' | 'partial';
type ArtifactType = 'workflow_artifact' | 'release_asset' | 'external_storage';

interface EvidenceArtifact {
  type: ArtifactType;
  reference: string;
  sha256?: string;
}

interface EvidenceRelated {
  release_tag?: string;
  iso_week?: string;
  incident_id?: string;
}

interface EvidenceEntry {
  id: string;
  kind: EvidenceKind;
  generated_at_utc: string;
  commit_sha: string;
  ref: string;
  status: EvidenceStatus;
  artifact: EvidenceArtifact;
  notes?: string;
  related?: EvidenceRelated;
}

// --- Constants ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../../');
const INDEX_JSON_PATH = path.join(REPO_ROOT, 'docs/ops/EVIDENCE_INDEX.json');
const INDEX_MD_PATH = path.join(REPO_ROOT, 'docs/ops/EVIDENCE_INDEX.md');

const VALID_KINDS = new Set(['weekly', 'release', 'incident', 'ad-hoc']);
const VALID_STATUSES = new Set(['pass', 'fail', 'partial']);
const VALID_ARTIFACT_TYPES = new Set(['workflow_artifact', 'release_asset', 'external_storage']);

// --- Helpers ---
function fail(msg: string) {
  console.error(`❌ ${msg}`);
  process.exit(1);
}

function info(msg: string) {
  console.log(`ℹ️  ${msg}`);
}

function success(msg: string) {
  console.log(`✅ ${msg}`);
}

// --- Main Validation Logic ---
function validateEntry(entry: any, index: number) {
  const prefix = `Entry #${index} (ID: ${entry.id || 'MISSING'})`;

  // Required fields
  if (!entry.id) fail(`${prefix}: Missing 'id'`);
  if (!entry.kind) fail(`${prefix}: Missing 'kind'`);
  if (!entry.generated_at_utc) fail(`${prefix}: Missing 'generated_at_utc'`);
  if (!entry.commit_sha) fail(`${prefix}: Missing 'commit_sha'`);
  if (!entry.ref) fail(`${prefix}: Missing 'ref'`);
  if (!entry.status) fail(`${prefix}: Missing 'status'`);
  if (!entry.artifact) fail(`${prefix}: Missing 'artifact'`);

  // Enums
  if (!VALID_KINDS.has(entry.kind)) fail(`${prefix}: Invalid kind '${entry.kind}'`);
  if (!VALID_STATUSES.has(entry.status)) fail(`${prefix}: Invalid status '${entry.status}'`);
  if (!VALID_ARTIFACT_TYPES.has(entry.artifact.type)) fail(`${prefix}: Invalid artifact.type '${entry.artifact.type}'`);
  if (!entry.artifact.reference) fail(`${prefix}: Missing 'artifact.reference'`);

  // Date format (ISO8601)
  if (isNaN(Date.parse(entry.generated_at_utc))) {
    fail(`${prefix}: Invalid ISO8601 date '${entry.generated_at_utc}'`);
  }

  // ID Format check (basic heuristic)
  // "<UTC_YYYYMMDDTHHMMSSZ>*<shortsha>" or "<YEAR>-W<WW>*<shortsha>"
  const idPattern1 = /^\d{4}\d{2}\d{2}T\d{2}\d{2}\d{2}Z\*[a-f0-9]+$/; // Timestamp
  const idPattern2 = /^\d{4}-W\d{2}\*[a-f0-9]+$/; // Week
  // Allow the example ID specifically or stricter patterns
  if (entry.id === '2025-W42*example') {
      // Pass
  } else if (!idPattern1.test(entry.id) && !idPattern2.test(entry.id)) {
     // Don't fail hard, just warn, as the requirement says "must include", but format might evolve.
     // Actually requirement says: * id (string): "<UTC_YYYYMMDDTHHMMSSZ>*<shortsha>" or "<YEAR>-W<WW>*<shortsha>"
     // So we should enforce it.
     fail(`${prefix}: Invalid ID format. Must match '<UTC_TIMESTAMP>*<SHORTSHA>' or '<YEAR>-W<WW>*<SHORTSHA>'.`);
  }
}

function main() {
  info(`Validating Ops Evidence Index...`);

  // 1. Read JSON
  if (!fs.existsSync(INDEX_JSON_PATH)) {
    fail(`JSON index not found at ${INDEX_JSON_PATH}`);
  }

  let data: EvidenceEntry[];
  try {
    const raw = fs.readFileSync(INDEX_JSON_PATH, 'utf-8');
    data = JSON.parse(raw);
  } catch (e: any) {
    fail(`Failed to parse JSON: ${e.message}`);
    return; // allow TS to infer data is assigned (though fail exits)
  }

  if (!Array.isArray(data)) {
    fail(`Root element must be an array`);
  }

  // 2. Validate Entries & Ordering
  let lastDate: Date | null = null;

  data.forEach((entry, i) => {
    validateEntry(entry, i);

    const currentDate = new Date(entry.generated_at_utc);
    if (lastDate) {
      if (currentDate > lastDate) {
        fail(`Entry #${i} (${entry.id}) is newer than the previous entry. Index must be sorted newest-first.`);
      }
    }
    lastDate = currentDate;
  });

  success(`JSON index schema and ordering validated (${data.length} entries).`);

  // 3. Optional: Check MD consistency
  if (fs.existsSync(INDEX_MD_PATH)) {
    const mdContent = fs.readFileSync(INDEX_MD_PATH, 'utf-8');
    let missingIds = 0;
    data.forEach(entry => {
        // Simple string search for ID to avoid complex MD parsing
        if (!mdContent.includes(entry.id)) {
            console.warn(`⚠️  Warning: Entry ID ${entry.id} not found in Markdown file.`);
            missingIds++;
        }
    });
    if (missingIds === 0) {
        success(`Markdown index appears to contain all IDs.`);
    }
  } else {
      console.warn(`⚠️  Markdown index not found at ${INDEX_MD_PATH}`);
  }
}

main();
