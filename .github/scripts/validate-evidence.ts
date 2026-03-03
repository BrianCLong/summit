import * as fs from 'fs';
import * as path from 'path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

const schemaDir = path.resolve('src/graphrag/evidence/schemas');
const schemas = {
  report: JSON.parse(fs.readFileSync(path.join(schemaDir, 'report.schema.json'), 'utf8')),
  metrics: JSON.parse(fs.readFileSync(path.join(schemaDir, 'metrics.schema.json'), 'utf8')),
  stamp: JSON.parse(fs.readFileSync(path.join(schemaDir, 'stamp.schema.json'), 'utf8')),
  index: JSON.parse(fs.readFileSync(path.join(schemaDir, 'index.schema.json'), 'utf8')),
};

function validateFile(filepath: string, schema: any): boolean {
  try {
    const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));

    // INFOWAR specific validation: only validate if item_slug is INFOWAR
    // or evidence_id indicates it's an INFOWAR artifact.
    // This prevents failing on legacy evidence bundles that don't follow the new schema.
    const isInfowar = (data.item_slug === 'INFOWAR') ||
                      (data.evidence_id && data.evidence_id.startsWith('EVD-INFOWAR'));

    if (!isInfowar) {
      return true; // Skip non-INFOWAR files
    }

    const validate = ajv.compile(schema);
    const valid = validate(data);
    if (!valid) {
      console.error(`❌ Validation failed for ${filepath}:`);
      console.error(JSON.stringify(validate.errors, null, 2));
      return false;
    }
    return true;
  } catch (err: any) {
    console.error(`❌ Error reading or parsing ${filepath}: ${err.message}`);
    return false;
  }
}

function walkAndValidate(dir: string): boolean {
  let allValid = true;
  if (!fs.existsSync(dir)) return true;

  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      if (!walkAndValidate(fullPath)) allValid = false;
    } else if (file.endsWith('.json')) {
      // Determine schema based on filename or parent directory
      let schema = null;
      if (file === 'report.json') schema = schemas.report;
      else if (file === 'metrics.json') schema = schemas.metrics;
      else if (file === 'stamp.json') schema = schemas.stamp;
      else if (file === 'index.json') schema = schemas.index;

      if (schema) {
        if (!validateFile(fullPath, schema)) {
          allValid = false;
        } else {
          console.log(`✅ Validated ${fullPath}`);
        }
      }
    }
  }
  return allValid;
}

// Support CLI usage for specific files
const [,, fileType, filePath] = process.argv;
if (fileType && filePath) {
  const schema = (schemas as any)[fileType];
  if (schema) {
    if (validateFile(filePath, schema)) {
      console.log(`✅ ${filePath} is valid.`);
      process.exit(0);
    } else {
      process.exit(1);
    }
  } else {
    console.error(`❌ Unknown schema type: ${fileType}`);
    process.exit(1);
  }
} else {
  // Default behavior: walk 'evidence' and 'tests/fixtures/evidence'
  console.log('🔍 Scanning for evidence bundles...');
  const roots = ['evidence', 'tests/fixtures/evidence'];
  let overallValid = true;
  for (const root of roots) {
    if (!walkAndValidate(root)) overallValid = false;
  }

  if (!overallValid) {
    process.exit(1);
  }
  console.log('✨ All discovered evidence bundles are valid.');
}
