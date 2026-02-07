import fs from 'fs';
import path from 'path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const args = process.argv.slice(2);
const evidenceFlagIndex = args.indexOf('--evidence');
const evidenceDir = evidenceFlagIndex !== -1 ? args[evidenceFlagIndex + 1] : 'evidence';

const requiredFiles = ['report.json', 'metrics.json', 'stamp.json', 'index.json'];
const schemaMap = {
  report: 'report.schema.json',
  metrics: 'metrics.schema.json',
  stamp: 'stamp.schema.json',
  index: 'index.schema.json'
};

const requiredEvidenceIds = new Set([
  'EVD-SPEMO-SCHEMA-001',
  'EVD-SPEMO-ALIGN-001',
  'EVD-SPEMO-ALIGN-NEG-001'
]);

const repoRoot = process.cwd();
const errors = [];

const resolvePath = (targetPath) =>
  path.isAbsolute(targetPath) ? targetPath : path.resolve(repoRoot, targetPath);

const readJson = (filePath) => {
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
};

const collectTimestampKeys = (value, trail = []) => {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => collectTimestampKeys(entry, [...trail, String(index)]));
    return;
  }

  if (value && typeof value === 'object') {
    Object.entries(value as Record<string, unknown>).forEach(([key, entry]) => {
      if (/timestamp|time|date/i.test(key)) {
        errors.push(`timestamp-like key "${[...trail, key].join('.')}" is not allowed`);
      }
      collectTimestampKeys(entry, [...trail, key]);
    });
  }
};

const ensureFiles = () => {
  requiredFiles.forEach((fileName) => {
    const fullPath = path.join(evidenceDir, fileName);
    if (!fs.existsSync(fullPath)) {
      errors.push(`missing required evidence file: ${fullPath}`);
    }
  });
};

const validateSchema = (label, data, schemaDir) => {
  const schemaPath = path.join(schemaDir, schemaMap[label]);
  if (!fs.existsSync(schemaPath)) {
    errors.push(`missing schema: ${schemaPath}`);
    return;
  }

  const schema = readJson(schemaPath);
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  const valid = validate(data);

  if (!valid && validate.errors) {
    const details = validate.errors.map((err) => `${err.instancePath} ${err.message}`).join('; ');
    errors.push(`${label} schema validation failed: ${details}`);
  }
};

const validateStamp = (stamp) => {
  const allowedKeys = new Set(['timestamp', 'version']);
  Object.keys(stamp).forEach((key) => {
    if (!allowedKeys.has(key)) {
      errors.push(`stamp.json contains non-timestamp field: ${key}`);
    }
  });
};

const validateIndexEvidence = (index) => {
  const items = index.items ?? [];
  const found = new Set(items.map((item) => item.evidence_id).filter(Boolean));

  requiredEvidenceIds.forEach((id) => {
    if (!found.has(id)) {
      errors.push(`missing evidence id mapping in index.json: ${id}`);
    }
  });

  items.forEach((item) => {
    if (!item.evidence_id || !item.files) {
      return;
    }

    if (!requiredEvidenceIds.has(item.evidence_id)) {
      return;
    }

    Object.entries(item.files).forEach(([key, value]) => {
      if (!value) {
        errors.push(`missing ${key} file for ${item.evidence_id}`);
        return;
      }

      const resolved = resolvePath(value);
      if (!fs.existsSync(resolved)) {
        errors.push(`referenced file missing for ${item.evidence_id}: ${value}`);
      }
    });
  });
};

ensureFiles();

if (errors.length === 0) {
  const schemaDir = path.join(evidenceDir, 'schemas');
  const report = readJson(path.join(evidenceDir, 'report.json'));
  const metrics = readJson(path.join(evidenceDir, 'metrics.json'));
  const stamp = readJson(path.join(evidenceDir, 'stamp.json'));
  const index = readJson(path.join(evidenceDir, 'index.json'));

  validateSchema('report', report, schemaDir);
  validateSchema('metrics', metrics, schemaDir);
  validateSchema('stamp', stamp, schemaDir);
  validateSchema('index', index, schemaDir);

  collectTimestampKeys(report, ['report']);
  collectTimestampKeys(metrics, ['metrics']);
  collectTimestampKeys(index, ['index']);

  validateStamp(stamp);
  validateIndexEvidence(index);
}

if (errors.length > 0) {
  console.error('mm-evidence-verify failed:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log('mm-evidence-verify passed.');
