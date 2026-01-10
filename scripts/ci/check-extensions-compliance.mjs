import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const reportOnly = args.includes('--report') || args.includes('--dry-run');
const overrideEnabled = ['1', 'true', 'yes'].includes(
  String(process.env.EXTENSION_GOVERNANCE_OVERRIDE || '').toLowerCase(),
);

const EXTENSION_ROOTS = [
  {
    name: 'extensions',
    root: 'extensions',
    markers: ['extension.json', 'package.json'],
  },
  {
    name: 'plugins',
    root: 'plugins',
    markers: ['plugin.json', 'maestro-plugin.yaml', 'package.json'],
  },
];

const FORBIDDEN_PATH_TOKENS = ['..', '/secrets', 'secrets/', '.env'];
const GA_PROTECTED_PATHS = [
  'docs/ga/MVP4_GA_BASELINE.md',
  'docs/security/SECURITY_REMEDIATION_LEDGER.md',
];

const IGNORED_DIRS = new Set([
  '.git',
  'node_modules',
  'dist',
  'build',
  'out',
  '.turbo',
]);

function collectCandidateDirs(rootDir, markers) {
  const candidates = new Set();
  const rootPath = path.join(ROOT, rootDir);

  if (!fs.existsSync(rootPath)) {
    return [];
  }

  const walk = (currentPath) => {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });
    const files = entries.filter((entry) => entry.isFile()).map((entry) => entry.name);
    const hasMarker = files.some((file) => markers.includes(file));
    const relative = path.relative(rootPath, currentPath);

    if (hasMarker && relative !== '') {
      candidates.add(currentPath);
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }
      if (IGNORED_DIRS.has(entry.name)) {
        continue;
      }
      walk(path.join(currentPath, entry.name));
    }
  };

  walk(rootPath);
  return Array.from(candidates);
}

function readJson(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

function hasForbiddenPath(value) {
  if (!value || typeof value !== 'string') {
    return false;
  }
  if (value.startsWith('/')) {
    return true;
  }
  return FORBIDDEN_PATH_TOKENS.some((token) => value.includes(token));
}

function scanForbiddenText(text) {
  return FORBIDDEN_PATH_TOKENS.some((token) => text.includes(token));
}

function validatePluginManifest(manifestPath, context) {
  const manifest = readJson(manifestPath);
  const violations = [];

  if (!manifest.id || !manifest.name || !manifest.version) {
    violations.push(`${context}: plugin.json must include id, name, and version.`);
  }

  if (!Array.isArray(manifest.permissions)) {
    violations.push(`${context}: plugin.json must declare permissions array.`);
  }

  const entrypoints = manifest.entrypoints || {};
  for (const value of Object.values(entrypoints)) {
    const entryPath = typeof value === 'string' ? value : value?.path;
    if (hasForbiddenPath(entryPath)) {
      violations.push(`${context}: entrypoint path "${entryPath}" uses forbidden paths.`);
    }
  }

  return violations;
}

function validateMaestroPluginManifest(manifestPath, context) {
  const raw = fs.readFileSync(manifestPath, 'utf8');
  const violations = [];

  if (!raw.includes('permissions:')) {
    violations.push(`${context}: maestro-plugin.yaml must declare permissions.`);
  }

  if (scanForbiddenText(raw)) {
    violations.push(`${context}: maestro-plugin.yaml contains forbidden path tokens.`);
  }

  return violations;
}

function validateExtensionManifest(manifestPath, context) {
  const manifest = readJson(manifestPath);
  const violations = [];

  if (!manifest.name || !manifest.version) {
    violations.push(`${context}: extension.json must include name and version.`);
  }

  if (!Array.isArray(manifest.permissions)) {
    violations.push(`${context}: extension.json must declare permissions array.`);
  }

  if (!manifest.summit || !manifest.summit.minVersion) {
    violations.push(`${context}: extension.json must declare summit.minVersion compatibility.`);
  }

  const entrypoints = manifest.entrypoints || {};
  for (const entry of Object.values(entrypoints)) {
    const entryPath = entry?.path;
    if (hasForbiddenPath(entryPath)) {
      violations.push(`${context}: entrypoint path "${entryPath}" uses forbidden paths.`);
    }
  }

  return violations;
}

function isVscodeExtension(dirPath) {
  const pkgPath = path.join(dirPath, 'package.json');
  if (!fs.existsSync(pkgPath)) {
    return false;
  }
  const pkg = readJson(pkgPath);
  return Boolean(pkg.engines && pkg.engines.vscode);
}

function getChangedFiles() {
  try {
    const baseRef = process.env.GITHUB_BASE_REF;
    if (baseRef) {
      const output = execSync(`git diff --name-only origin/${baseRef}...HEAD`, {
        encoding: 'utf8',
      });
      return output.split('\n').filter(Boolean);
    }
    const output = execSync('git diff --name-only', { encoding: 'utf8' });
    return output.split('\n').filter(Boolean);
  } catch (error) {
    return [];
  }
}

function main() {
  if (overrideEnabled) {
    console.log('Governed exception enabled via EXTENSION_GOVERNANCE_OVERRIDE.');
    process.exit(0);
  }

  const violations = [];
  const governedExceptions = [];

  for (const surface of EXTENSION_ROOTS) {
    const candidates = collectCandidateDirs(surface.root, surface.markers);

    for (const candidate of candidates) {
      const relative = path.relative(ROOT, candidate);
      const pluginManifest = path.join(candidate, 'plugin.json');
      const maestroManifest = path.join(candidate, 'maestro-plugin.yaml');
      const extensionManifest = path.join(candidate, 'extension.json');

      if (surface.root === 'plugins') {
        if (fs.existsSync(pluginManifest)) {
          violations.push(...validatePluginManifest(pluginManifest, relative));
          continue;
        }
        if (fs.existsSync(maestroManifest)) {
          violations.push(...validateMaestroPluginManifest(maestroManifest, relative));
          continue;
        }
        violations.push(`${relative}: plugin manifest missing (plugin.json or maestro-plugin.yaml).`);
        continue;
      }

      if (surface.root === 'extensions') {
        if (fs.existsSync(extensionManifest)) {
          violations.push(...validateExtensionManifest(extensionManifest, relative));
          continue;
        }
        if (isVscodeExtension(candidate)) {
          governedExceptions.push(`${relative}: governed exception (VS Code extension).`);
          continue;
        }
        violations.push(`${relative}: extension.json missing and not a governed exception.`);
      }
    }
  }

  const changedFiles = getChangedFiles();
  const extensionTouched = changedFiles.some(
    (file) => file.startsWith('extensions/') || file.startsWith('plugins/'),
  );
  const gaTouched = changedFiles.some((file) =>
    GA_PROTECTED_PATHS.some((protectedPath) => file === protectedPath),
  );

  if (extensionTouched && gaTouched) {
    violations.push(
      'GA baseline artifacts changed alongside extension surfaces. Use a governed exception override.',
    );
  }

  console.log('Extension governance compliance report');
  console.log(`- Extension surfaces scanned: ${EXTENSION_ROOTS.map((s) => s.root).join(', ')}`);
  console.log(`- Governed exceptions: ${governedExceptions.length}`);
  console.log(`- Violations: ${violations.length}`);

  if (governedExceptions.length > 0) {
    console.log('\nGoverned exceptions:');
    governedExceptions.forEach((entry) => console.log(`  - ${entry}`));
  }

  if (violations.length > 0) {
    console.log('\nViolations:');
    violations.forEach((entry) => console.log(`  - ${entry}`));
  }

  if (violations.length > 0 && !reportOnly) {
    process.exit(1);
  }
}

main();
