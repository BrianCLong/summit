import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

// Simple JSON Schema validator (or use ajv if available, but let's try to be dependency-light or use what's there)
// The repo has 'ajv' in devDependencies.
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const BUNDLE_PATH = path.resolve(process.cwd(), 'evidence/out/evidence-bundle.json');
const SCHEMA_PATH = path.resolve(process.cwd(), 'evidence/schema/evidence-bundle.schema.json');

const fail = (msg: string) => {
  console.error(`❌ Verification Failed: ${msg}`);
  process.exit(1);
};

const info = (msg: string) => {
  console.log(`✅ ${msg}`);
};

const run = async () => {
  if (!fs.existsSync(BUNDLE_PATH)) {
    fail(`Bundle file not found at ${BUNDLE_PATH}`);
  }

  if (!fs.existsSync(SCHEMA_PATH)) {
    fail(`Schema file not found at ${SCHEMA_PATH}`);
  }

  const bundle = JSON.parse(fs.readFileSync(BUNDLE_PATH, 'utf-8'));
  const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf-8'));

  // 1. Schema Validity
  const ajv = new Ajv();
  addFormats(ajv);
  const validate = ajv.compile(schema);
  const valid = validate(bundle);

  if (!valid) {
    console.error('Schema Validation Errors:', validate.errors);
    fail('Bundle does not match schema.');
  }
  info('Schema validation passed.');

  // 2. Consistency Checks
  // Check git sha matches current HEAD
  try {
    const currentSha = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
    if (bundle.meta.git_sha !== currentSha) {
      // In CI, sometimes we verify a bundle generated in a previous step, so it should match.
      // However, if we are verifying an artifact from a *different* commit, this would fail.
      // For now, assuming "verify what we just built".
      // But let's be lenient if we are not in a git repo (e.g. docker container without .git)
      // or providing an override.
      if (process.env.SKIP_SHA_CHECK !== 'true') {
         // If currentSha is available (not erroring), we check.
         if (currentSha && bundle.meta.git_sha !== currentSha) {
             fail(`Bundle SHA (${bundle.meta.git_sha}) does not match current HEAD (${currentSha})`);
         }
      }
    } else {
        info('Git SHA matches HEAD.');
    }
  } catch (e) {
    console.warn('⚠️ Could not determine current git SHA, skipping consistency check.');
  }

  // 3. Freshness Rules
  // Bundle created within last X hours (e.g. 1 hour)
  const bundleTime = new Date(bundle.meta.timestamp).getTime();
  const now = Date.now();
  const maxAgeMs = 3600 * 1000; // 1 hour

  if (now - bundleTime > maxAgeMs) {
    fail(`Bundle is too old. Created at ${bundle.meta.timestamp}, threshold is 1 hour.`);
  }
  info('Freshness check passed.');

  // 4. Required Fields Check (covered by Schema, but explicit logic check for stub)
  if (bundle.provenance.attestationStatus === 'stub') {
    if (!bundle.provenance.issueLink) {
      fail('Provenance stub must provide an issue link.');
    }
    info('Provenance stub correctly formatted.');
  }

  console.log('\n🎉 Evidence Bundle Verified Successfully!');
};

run().catch(e => {
  console.error(e);
  process.exit(1);
});
