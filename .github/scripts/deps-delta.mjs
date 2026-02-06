import { execSync } from 'child_process';
import { access, readFile } from 'fs/promises';
import path from 'path';

const DIFF_BASE =
  process.env.GITHUB_BASE_REF && process.env.GITHUB_BASE_REF.length > 0
    ? `origin/${process.env.GITHUB_BASE_REF}`
    : 'origin/main';

const getChangedFiles = () => {
  const diff = execSync(`git diff --name-only ${DIFF_BASE}...HEAD`, {
    encoding: 'utf8',
  });
  return diff.split('\n').map((line) => line.trim()).filter(Boolean);
};

const hasDependencyChanges = (files) =>
  files.some(
    (file) =>
      file === 'pnpm-lock.yaml' ||
      file.endsWith('package.json') ||
      file.endsWith('package-lock.json'),
  );

const ensureDependencyDeltaLogged = async (files) => {
  const docPath = path.resolve('docs/governance/dependency-delta.md');
  await access(docPath);
  const contents = await readFile(docPath, 'utf8');
  const missing = files.filter((file) => !contents.includes(file));
  if (missing.length > 0) {
    throw new Error(
      `Dependency delta missing entries for: ${missing.join(', ')}`,
    );
  }
};

const run = async () => {
  const files = getChangedFiles();
  if (!hasDependencyChanges(files)) {
    console.log('deps-delta: PASS (no dependency changes)');
    return;
  }

  await ensureDependencyDeltaLogged(
    files.filter(
      (file) =>
        file === 'pnpm-lock.yaml' ||
        file.endsWith('package.json') ||
        file.endsWith('package-lock.json'),
    ),
  );
  console.log('deps-delta: PASS');
};

run().catch((error) => {
  console.error(`deps-delta: FAIL ${error.message}`);
  process.exit(1);
});
