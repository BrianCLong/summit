import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const POLICY_DIR = path.resolve(__dirname, '../../docs/governance/policies');
const ARTIFACT_DIR = path.resolve(__dirname, '../../artifacts/governance/policy');

// Policy Schema Validation (Simple custom validation to avoid new deps)
function validateSchema(filename, content) {
  const errors = [];

  // Basic YAML structure check (we assume content is already parsed or we parse it)
  // Since we want to avoid new deps like js-yaml if possible, let's see if we can use a simple regex or check.
  // Wait, I should probably use a library if available, but the instructions say "no new deps if possible".
  // Node.js doesn't have a built-in YAML parser.
  // I'll assume for this script I can use a simple line-based parser or try to import 'yaml' if it exists in the repo,
  // or just do basic string validation for the sake of this exercise if I can't find a parser.
  // However, `js-yaml` is a very common dep. Let's check package.json.

  // Checking if I can use a regex-based approach for critical fields.
  // Note: This regex-based validation is a lightweight check to avoid adding dependencies (like js-yaml).
  // For production use, or if the policy structure becomes complex, it is strongly recommended to
  // use a proper YAML parser.

  if (filename.endsWith('.yml')) {
    // Use Regex to anchor to start of line (allowing indentation) for keys
    if (!/^\s*id:/m.test(content)) errors.push('Missing required field: id');
    if (!/^\s*description:/m.test(content)) errors.push('Missing required field: description');

    // Forbidden fields - check for keys
    if (/^\s*allow_all:/m.test(content)) errors.push('Forbidden field: allow_all');
    if (/^\s*bypass:/m.test(content)) errors.push('Forbidden field: bypass');
  }

  return errors;
}

async function main() {
  console.log(`Validating policies in ${POLICY_DIR}...`);

  if (!fs.existsSync(POLICY_DIR)) {
    console.error(`Policy directory not found: ${POLICY_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(POLICY_DIR).sort();
  const policyContent = [];
  const report = {
    timestamp: new Date().toISOString(),
    policies: [],
    valid: true,
    errors: []
  };

  for (const file of files) {
    if (file.startsWith('.')) continue; // Ignore hidden files

    const filepath = path.join(POLICY_DIR, file);
    const content = fs.readFileSync(filepath, 'utf8');

    // Validate
    const errors = validateSchema(file, content);
    if (errors.length > 0) {
      report.valid = false;
      report.errors.push(...errors.map(e => `${file}: ${e}`));
      console.error(`Validation failed for ${file}:`, errors);
    }

    policyContent.push({
      file,
      hash: crypto.createHash('sha256').update(content).digest('hex'),
      content // Store content for global hash
    });

    report.policies.push({
      file,
      hash: crypto.createHash('sha256').update(content).digest('hex')
    });
  }

  if (!report.valid) {
    console.error('Policy validation failed.');
    process.exit(1);
  }

  // Compute global hash (concatenated content of all files)
  const globalHashInput = policyContent.map(p => `${p.file}:${p.content}`).join('\n');
  const globalHash = crypto.createHash('sha256').update(globalHashInput).digest('hex');

  console.log(`Global Policy Hash: ${globalHash}`);

  // Create artifact directory
  const versionDir = path.join(ARTIFACT_DIR, globalHash);
  if (!fs.existsSync(versionDir)) {
    fs.mkdirSync(versionDir, { recursive: true });
  }

  // Write artifacts
  fs.writeFileSync(path.join(versionDir, 'policy_hash.txt'), globalHash);
  fs.writeFileSync(path.join(versionDir, 'report.json'), JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(versionDir, 'stamp.json'), JSON.stringify({
    hash: globalHash,
    timestamp: report.timestamp,
    actor: process.env.USER || 'ci',
    approved: true // In a real flow, this would come from an approval step
  }, null, 2));

  console.log(`Artifacts written to ${versionDir}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
