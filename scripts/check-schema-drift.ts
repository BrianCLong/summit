import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// Files to check
const TARGET_FILES = [
  {
    originalPath: 'packages/provenance/schema/receipt.schema.json',
    filename: 'receipt.schema.json'
  },
  {
    originalPath: 'schemas/policy-decision.schema.json',
    filename: 'policy-decision.schema.json'
  }
];

const TEMP_DIR = path.resolve(process.cwd(), 'temp_schemas_drift_check');

try {
  console.log('Starting schema drift check...');

  // 1. Create temp directory
  if (fs.existsSync(TEMP_DIR)) {
    fs.rmSync(TEMP_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(TEMP_DIR, { recursive: true });

  // 2. Run generation script targeting the temp directory
  console.log('Generating schemas to temp directory...');
  // We use ts-node to run the script. We pass TEMP_OUTPUT_DIR env var.
  execSync(`TEMP_OUTPUT_DIR=${TEMP_DIR} npx ts-node --esm scripts/gen-schemas.ts`, { stdio: 'inherit' });

  // 3. Compare files
  let hasDrift = false;

  for (const target of TARGET_FILES) {
    const originalPath = path.resolve(process.cwd(), target.originalPath);
    const generatedPath = path.join(TEMP_DIR, target.filename);

    if (!fs.existsSync(generatedPath)) {
      console.error(`Error: Generated file not found: ${generatedPath}`);
      hasDrift = true;
      continue;
    }

    if (!fs.existsSync(originalPath)) {
       console.error(`Error: Original file not found: ${originalPath}`);
       hasDrift = true;
       continue;
    }

    const originalContent = fs.readFileSync(originalPath, 'utf-8');
    const generatedContent = fs.readFileSync(generatedPath, 'utf-8');

    if (originalContent.trim() !== generatedContent.trim()) {
      console.error(`DRIFT DETECTED: ${target.originalPath} does not match generated schema.`);
      // Show simple diff hint (could be improved with a diff library)
      console.error(`Length: Original (${originalContent.length}) vs Generated (${generatedContent.length})`);
      hasDrift = true;
    } else {
      console.log(`OK: ${target.originalPath} matches generated schema.`);
    }
  }

  // 4. Cleanup
  if (!process.env.KEEP_TEMP) {
      fs.rmSync(TEMP_DIR, { recursive: true, force: true });
  }

  if (hasDrift) {
    console.error('Schema drift detected. Please run "npx ts-node --esm scripts/gen-schemas.ts" (or via package.json script) to update schemas.');
    process.exit(1);
  } else {
    console.log('Schema drift check passed.');
  }

} catch (e) {
  console.error('An error occurred during drift check:', e);
  process.exit(1);
}
