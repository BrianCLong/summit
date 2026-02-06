import fs from 'fs';
import path from 'path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const ajv = new Ajv({ allErrors: true, allowUnionTypes: true });
addFormats(ajv);

const SCHEMAS = {
  index: 'docs/ga/evidence-schema/index.schema.json',
  report: 'docs/ga/evidence-schema/report.schema.json',
  metrics: 'docs/ga/evidence-schema/metrics.schema.json',
  stamp: 'docs/ga/evidence-schema/stamp.schema.json'
};

function loadJSON(filepath: string) {
  try {
    return JSON.parse(fs.readFileSync(filepath, 'utf8'));
  } catch (error: any) {
    console.error(`Error reading ${filepath}: ${error.message}`);
    process.exit(1);
  }
}

function validate(schemaPath: string, data: any, context: string) {
  const schema = loadJSON(schemaPath);
  const validateFn = ajv.compile(schema);
  const valid = validateFn(data);
  if (!valid) {
    console.error(`Validation failed for ${context}:`);
    console.error(ajv.errorsText(validateFn.errors));
    process.exit(1);
  }
}

function checkTimestampIsolation(data: any, filepath: string, isStampFile: boolean) {
  const timestampKeys = ['timestamp', 'event_time', 'created_at', 'updated_at', 'time'];
  const stringified = JSON.stringify(data).toLowerCase();

  if (!isStampFile) {
    for (const key of timestampKeys) {
      if (stringified.includes(`"${key}"`)) {
        console.error(`Forbidden timestamp-like key "${key}" found in non-stamp file: ${filepath}`);
        console.error('All timestamps must be isolated to stamp.json files.');
        process.exit(1);
      }
    }
  }
}

function main() {
  const indexFile = 'evidence/index.json';
  if (!fs.existsSync(indexFile)) {
    console.warn(`Evidence index not found at ${indexFile}. Skipping.`);
    return;
  }

  const indexData = loadJSON(indexFile);
  validate(SCHEMAS.index, indexData, indexFile);

  for (const item of indexData.items) {
    const { evidence_id, files } = item;
    const isATG = evidence_id.startsWith('EVD-ATG-');

    console.log(`Verifying evidence: ${evidence_id} ${isATG ? '[ATG Strict]' : '[Legacy]'}`);

    const reportPath = files.report;
    const metricsPath = files.metrics;
    const stampPath = files.stamp;

    if (fs.existsSync(reportPath)) {
      const reportData = loadJSON(reportPath);
      if (isATG) {
        validate(SCHEMAS.report, reportData, reportPath);
      }
      checkTimestampIsolation(reportData, reportPath, false);
    } else {
      console.warn(`Warning: Report file missing for ${evidence_id}: ${reportPath}`);
    }

    if (fs.existsSync(metricsPath)) {
      const metricsData = loadJSON(metricsPath);
      if (isATG) {
        validate(SCHEMAS.metrics, metricsData, metricsPath);
      }
      checkTimestampIsolation(metricsData, metricsPath, false);
    } else {
      console.warn(`Warning: Metrics file missing for ${evidence_id}: ${metricsPath}`);
    }

    if (fs.existsSync(stampPath)) {
      const stampData = loadJSON(stampPath);
      if (isATG) {
        validate(SCHEMAS.stamp, stampData, stampPath);
      }
      // Stamp file IS allowed to have timestamps
    } else {
      console.warn(`Warning: Stamp file missing for ${evidence_id}: ${stampPath}`);
    }
  }

  console.log('✅ Evidence verification complete.');
}

main();
