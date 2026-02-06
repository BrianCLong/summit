import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const indexPath = process.env.EVIDENCE_INDEX_PATH
  ? path.resolve(process.env.EVIDENCE_INDEX_PATH)
  : path.join(root, 'evidence', 'index.json');

function fail(message) {
  console.error(message);
  process.exit(1);
}

function readJson(filePath, label = filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    fail(`Failed to parse JSON (${label}): ${error.message}`);
  }
}

if (!fs.existsSync(indexPath)) {
  fail(`Missing evidence index: ${indexPath}`);
}

const index = readJson(indexPath, 'evidence index');

if (!index || index.version !== 1 || !Array.isArray(index.items)) {
  fail('Invalid evidence index schema: expected { version: 1, items: [] }');
}

const requiredFiles = ['report', 'metrics', 'stamp'];

index.items.forEach((item, idx) => {
  if (!item || typeof item !== 'object') {
    fail(`Invalid evidence item at index ${idx}: expected object`);
  }

  if (typeof item.evidence_id !== 'string' || item.evidence_id.trim() === '') {
    fail(`Invalid evidence_id at index ${idx}`);
  }

  if (!item.files || typeof item.files !== 'object') {
    fail(`Invalid files map for ${item.evidence_id}`);
  }

  requiredFiles.forEach((key) => {
    const filePath = item.files[key];
    if (typeof filePath !== 'string' || filePath.trim() === '') {
      fail(`Missing ${key} path for ${item.evidence_id}`);
    }

    const absolutePath = path.resolve(root, filePath);
    if (!fs.existsSync(absolutePath)) {
      fail(`Missing ${key} file for ${item.evidence_id}: ${filePath}`);
    }

    const payload = readJson(absolutePath, `${item.evidence_id}:${key}`);
    if (payload && typeof payload === 'object' && 'evidence_id' in payload) {
      if (payload.evidence_id !== item.evidence_id) {
        fail(
          `Evidence ID mismatch for ${item.evidence_id} (${key}): ${payload.evidence_id}`,
        );
      }
    }
  });
});

console.log(`evidence index ok: ${index.items.length} items`);
