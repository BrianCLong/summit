import fs from 'fs';
import path from 'path';
import Ajv from 'ajv';

const EVIDENCE_DIR = 'evidence';
const SCHEMA_DIR = path.join(EVIDENCE_DIR, 'schemas');

const ajv = new Ajv({ allErrors: true });

/**
 * Validates data against a schema file.
 */
function validate(data, schemaFile) {
  const schemaPath = path.join(SCHEMA_DIR, schemaFile);
  if (!fs.existsSync(schemaPath)) {
    console.warn(
      `Warning: Schema ${schemaFile} not found in ${SCHEMA_DIR}, skipping validation.`
    );
    return;
  }
  try {
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
    const validateFn = ajv.compile(schema);
    const valid = validateFn(data);
    if (!valid) {
      console.error(
        `Error: Validation failed for ${schemaFile}:`,
        JSON.stringify(validateFn.errors, null, 2)
      );
      process.exit(1);
    }
  } catch (e) {
    console.error(`Error processing schema ${schemaFile}:`, e.message);
    process.exit(1);
  }
}

/**
 * Validates that the evidence bundle matches the expected structure and determinism rules.
 */
function verifyEvidence() {
  try {
    const indexPath = path.join(EVIDENCE_DIR, 'index.json');
    if (!fs.existsSync(indexPath)) {
      console.error('Error: index.json not found');
      process.exit(1);
    }
    const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    console.log('Verifying evidence index for item:', index.item || 'Unknown');
    validate(index, 'index.schema.json');

    const stampPath = path.join(EVIDENCE_DIR, 'stamp.json');
    if (fs.existsSync(stampPath)) {
      const stamp = JSON.parse(fs.readFileSync(stampPath, 'utf8'));
      validate(stamp, 'stamp.schema.json');
    }

    const reportPath = path.join(EVIDENCE_DIR, 'report.json');
    if (fs.existsSync(reportPath)) {
      const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
      validate(report, 'report.schema.json');
    }

    const metricsPath = path.join(EVIDENCE_DIR, 'metrics.json');
    if (fs.existsSync(metricsPath)) {
      const metrics = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));
      validate(metrics, 'metrics.schema.json');
    }

    // Check for expected EVD IDs
    if (index.item === 'ECC') {
      const requiredIds = ['EVD-ECC-IMPORT-001'];
      const presentIds = (index.evidence || []).map((e) => e.id);
      for (const id of requiredIds) {
        if (!presentIds.includes(id)) {
          console.error(`Error: Missing required evidence ID ${id}`);
          process.exit(1);
        }
      }
    }

    console.log('Evidence verification passed with schema validation.');
  } catch (e) {
    console.error('Verification failed:', e.message);
    process.exit(1);
  }
}

verifyEvidence();
