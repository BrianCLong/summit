import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import {
  ROOT_DIR,
  collectFiles,
  normalizePath,
  parseArgs,
  readPolicy,
  sha256File,
} from './evidence-utils.mjs';

const DEFAULT_POLICY = path.join(
  ROOT_DIR,
  'docs/ga/EVIDENCE_BUNDLE_POLICY.yml',
);

const getGitSha = () =>
  execSync('git rev-parse HEAD', { cwd: ROOT_DIR }).toString().trim();

const ensureExists = (filePath, errors) => {
  if (!fs.existsSync(filePath)) {
    errors.push(`Missing required file: ${filePath}`);
  }
};

const collectStrings = (value, output) => {
  if (typeof value === 'string') {
    output.push(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      collectStrings(item, output);
    }
    return;
  }
  if (value && typeof value === 'object') {
    for (const item of Object.values(value)) {
      collectStrings(item, output);
    }
  }
};

const getValueAtPath = (value, dottedPath) => {
  return dottedPath.split('.').reduce((acc, key) => {
    if (!acc || typeof acc !== 'object') {
      return undefined;
    }
    return acc[key];
  }, value);
};

const validateSboms = (bundleRoot, errors) => {
  const sbomDir = path.join(bundleRoot, 'sbom');
  if (!fs.existsSync(sbomDir)) {
    errors.push('Missing sbom/ directory.');
    return;
  }
  const sbomFiles = collectFiles(bundleRoot, ['sbom/**/*.json']);
  for (const relativePath of sbomFiles) {
    const fullPath = path.join(bundleRoot, relativePath);
    const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    if (data?.bomFormat !== 'CycloneDX') {
      errors.push(`SBOM format mismatch in ${relativePath}`);
    }
    if (!data?.specVersion || !data.specVersion.startsWith('1.')) {
      errors.push(`SBOM specVersion missing in ${relativePath}`);
    }
  }
};

const validateProvenance = (bundleRoot, policy, errors) => {
  const requiredFields = policy?.verification?.required_provenance_fields || {};
  const files = {
    ci: path.join(bundleRoot, 'provenance', 'ci.json'),
    hashes: path.join(bundleRoot, 'provenance', 'hashes.json'),
    slsa: path.join(bundleRoot, 'provenance', 'slsa-provenance.json'),
  };

  for (const [key, filePath] of Object.entries(files)) {
    if (!fs.existsSync(filePath)) {
      errors.push(`Missing provenance file: ${filePath}`);
      continue;
    }
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const required = requiredFields[key] || [];
    for (const fieldPath of required) {
      const value = getValueAtPath(data, fieldPath);
      if (value === undefined || value === null || value === '') {
        errors.push(`Missing required provenance field ${fieldPath} in ${key}`);
      }
    }

    const strings = [];
    collectStrings(data, strings);
    const patterns = policy?.verification?.secret_patterns || [];
    for (const pattern of patterns) {
      const regex = new RegExp(pattern);
      if (strings.some((value) => regex.test(value))) {
        errors.push(`Secret pattern ${pattern} found in ${key} provenance`);
      }
    }
  }
};

const validateManifest = (bundleRoot, policy, errors) => {
  const manifestPath = path.join(bundleRoot, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    errors.push('Missing manifest.json');
    return;
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const files = manifest.files || [];
  const sortedPaths = [...files]
    .map((entry) => entry.path)
    .slice()
    .sort();
  const manifestPaths = files.map((entry) => entry.path);

  if (manifestPaths.join('|') !== sortedPaths.join('|')) {
    errors.push('manifest.json file list is not sorted');
  }

  const manifestSet = new Set(manifestPaths);
  if (manifestSet.size !== manifestPaths.length) {
    errors.push('manifest.json contains duplicate file entries');
  }

  for (const entry of files) {
    const filePath = path.join(bundleRoot, entry.path);
    if (!fs.existsSync(filePath)) {
      errors.push(`Manifest references missing file ${entry.path}`);
      continue;
    }
    const digest = sha256File(filePath);
    if (digest !== entry.sha256) {
      errors.push(`Hash mismatch for ${entry.path}`);
    }
  }

  const exclusions = new Set(
    (policy?.bundle?.manifest_exclude || []).map((value) =>
      normalizePath(value),
    ),
  );
  exclusions.add('manifest.json');

  const allFiles = collectFiles(bundleRoot, ['**/*']).filter((file) => {
    const normalized = normalizePath(file);
    return !exclusions.has(normalized) && fs.statSync(path.join(bundleRoot, file)).isFile();
  });

  for (const file of allFiles) {
    if (!manifestSet.has(normalizePath(file))) {
      errors.push(`File missing from manifest: ${file}`);
    }
  }
};

const validateRequiredFiles = (bundleRoot, policy, errors) => {
  const requiredDirs = policy?.bundle?.required_dirs || [];
  const requiredFiles = policy?.bundle?.required_files || [];
  const requiredGlobs = policy?.bundle?.required_globs || [];

  for (const dir of requiredDirs) {
    const dirPath = path.join(bundleRoot, dir);
    if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
      errors.push(`Missing required directory: ${dirPath}`);
    }
  }

  for (const file of requiredFiles) {
    ensureExists(path.join(bundleRoot, file), errors);
  }

  for (const glob of requiredGlobs) {
    const matched = collectFiles(bundleRoot, [glob]);
    if (!matched.length) {
      errors.push(`Required glob did not match any files: ${glob}`);
    }
  }
};

const main = () => {
  const args = parseArgs(process.argv.slice(2));
  const policyPath = args.policy || DEFAULT_POLICY;
  const policy = readPolicy(policyPath);
  const sha = getGitSha();
  const bundleRoot =
    args.bundle || path.join(ROOT_DIR, 'artifacts/evidence', sha);

  if (!fs.existsSync(bundleRoot)) {
    console.error(`Bundle not found at ${bundleRoot}`);
    process.exit(2);
  }

  const errors = [];

  validateRequiredFiles(bundleRoot, policy, errors);
  validateSboms(bundleRoot, errors);
  validateProvenance(bundleRoot, policy, errors);
  validateManifest(bundleRoot, policy, errors);

  if (errors.length) {
    console.error('Evidence bundle verification failed:');
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log('Evidence bundle verified successfully.');
};

try {
  main();
} catch (error) {
  console.error(`Operational error: ${error.message}`);
  process.exit(2);
}
