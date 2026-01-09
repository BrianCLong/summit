import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { minimatch } from 'minimatch';
import yaml from 'js-yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../..');

export function loadPolicy(policyPath) {
  const raw = fs.readFileSync(policyPath, 'utf8');
  return yaml.load(raw);
}

export function listChangedFiles(baseRef, repoRoot = REPO_ROOT) {
  const command = baseRef
    ? `git diff --name-only ${baseRef}..HEAD`
    : 'git diff --name-only HEAD~1..HEAD';
  const output = execSync(command, { cwd: repoRoot, encoding: 'utf8' }).trim();
  if (!output) {
    return [];
  }
  return output.split('\n').filter(Boolean);
}

export function evaluateDiffPolicy(changedFiles, policy) {
  const forbiddenPatterns = policy?.forbidden_paths ?? [];

  const violations = changedFiles.filter((file) =>
    forbiddenPatterns.some((pattern) =>
      minimatch(file, pattern, { dot: true, matchBase: true })
    )
  );

  return {
    allowed: violations.length === 0,
    violations,
    forbidden_patterns: forbiddenPatterns,
  };
}

function renderSummary(result) {
  if (result.allowed) {
    return '✅ Train diff policy: no forbidden paths modified.';
  }

  const lines = result.violations.map((file) => `- ${file}`).join('\n');
  return `❌ Train diff policy violation.\n\nForbidden paths modified:\n${lines}`;
}

async function main() {
  const args = process.argv.slice(2);
  const policyIndex = args.indexOf('--policy');
  const baseIndex = args.indexOf('--base');

  const policyPath =
    policyIndex >= 0 && args[policyIndex + 1]
      ? args[policyIndex + 1]
      : path.join(REPO_ROOT, 'release/TRAIN_POLICY.yml');

  const baseRef = baseIndex >= 0 ? args[baseIndex + 1] : undefined;

  const policy = loadPolicy(policyPath);
  const changedFiles = listChangedFiles(baseRef);
  const result = evaluateDiffPolicy(changedFiles, policy);

  const outputDir = path.join(REPO_ROOT, 'dist/release-train');
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(
    path.join(outputDir, 'train-diff-policy.json'),
    JSON.stringify(result, null, 2)
  );

  console.log(renderSummary(result));

  if (!result.allowed) {
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
