import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const forbiddenTimestampKeys = [
  'timestamp',
  'createdAt',
  'updatedAt',
  'time',
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function loadSchema(ajv, schemaPath) {
  const schema = readJson(schemaPath);
  return ajv.compile(schema);
}

export function verifyEvidence({ rootDir = process.cwd() } = {}) {
  const evidenceDir = path.join(rootDir, 'artifacts', 'evidence');
  const schemaDir = path.join(evidenceDir, 'schemas');
  const ajv = new Ajv({ allErrors: true, strict: true });
  addFormats(ajv);

  const indexPath = path.join(evidenceDir, 'index.json');
  const indexSchemaPath = path.join(schemaDir, 'index.schema.json');
  const index = readJson(indexPath);
  const validateIndex = loadSchema(ajv, indexSchemaPath);

  if (!validateIndex(index)) {
    const error = new Error('EVIDENCE_INDEX_INVALID');
    error.details = validateIndex.errors;
    throw error;
  }

  const schemaMap = new Map([
    ['report.json', 'report.schema.json'],
    ['metrics.json', 'metrics.schema.json'],
    ['stamp.json', 'stamp.schema.json'],
  ]);

  for (const entry of index.evidence) {
    for (const rel of entry.files) {
      const fullPath = path.join(rootDir, rel);
      if (!fs.existsSync(fullPath)) {
        const error = new Error('EVIDENCE_FILE_MISSING');
        error.details = { id: entry.id, file: rel };
        throw error;
      }

      if (!rel.endsWith('stamp.json')) {
        const raw = fs.readFileSync(fullPath, 'utf8');
        for (const key of forbiddenTimestampKeys) {
          if (raw.includes(`"${key}"`)) {
            const error = new Error('NONDETERMINISTIC_FIELD_OUTSIDE_STAMP');
            error.details = { id: entry.id, file: rel, key };
            throw error;
          }
        }
      }

      const basename = path.basename(rel);
      const schemaName = schemaMap.get(basename);
      if (schemaName) {
        const validateFile = loadSchema(
          ajv,
          path.join(schemaDir, schemaName),
        );
        const payload = readJson(fullPath);
        if (!validateFile(payload)) {
          const error = new Error('EVIDENCE_FILE_INVALID');
          error.details = { id: entry.id, file: rel, errors: validateFile.errors };
          throw error;
        }
      }
    }
  }

  return { ok: true };
}

function main() {
  try {
    verifyEvidence();
    console.log('EVIDENCE_OK');
  } catch (error) {
    console.error(error.message, error.details ?? null);
    process.exit(1);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
