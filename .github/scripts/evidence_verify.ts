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

  let items = [];
  if (Array.isArray(indexData.items)) {
    items = indexData.items;
  } else {
    items = Object.entries(indexData.items).map(([id, meta]: [string, any]) => ({
      evidence_id: id,
      files: meta.files || meta.artifacts || []
    }));
  }

  for (const item of items) {
    const { evidence_id, files } = item;
    const isATG = evidence_id.startsWith('EVD-ATG-');
    console.log(`Verifying evidence: ${evidence_id} ${isATG ? '[ATG Strict]' : '[Legacy]'}`);

    const reportPath = Array.isArray(files) ? files.find(f => f.endsWith('report.json')) : files.report;
    const metricsPath = Array.isArray(files) ? files.find(f => f.endsWith('metrics.json')) : files.metrics;
    const stampPath = Array.isArray(files) ? files.find(f => f.endsWith('stamp.json')) : files.stamp;

    if (reportPath && fs.existsSync(reportPath)) {
      const reportData = loadJSON(reportPath);
      if (isATG) validate(SCHEMAS.report, reportData, reportPath);
      checkTimestampIsolation(reportData, reportPath, false);
    }

    if (metricsPath && fs.existsSync(metricsPath)) {
      const metricsData = loadJSON(metricsPath);
      if (isATG) validate(SCHEMAS.metrics, metricsData, metricsPath);
      checkTimestampIsolation(metricsData, metricsPath, false);
    }

    if (stampPath && fs.existsSync(stampPath)) {
      const stampData = loadJSON(stampPath);
      if (isATG) validate(SCHEMAS.stamp, stampData, stampPath);
    }
  }

  console.log('✅ Evidence verification complete.');
}

main();
