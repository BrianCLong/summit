#!/usr/bin/env node
/**
 * Package Script Normalization Script
 * Adds missing standard scripts to all packages based on their category
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');

// Standard script templates by package category
const SCRIPT_TEMPLATES = {
  app: {
    build: 'tsc && vite build',
    dev: 'vite --host 0.0.0.0',
    preview: 'vite preview',
    test: 'vitest run',
    'test:watch': 'vitest',
    lint: 'eslint . --ext .ts,.tsx',
    'lint:fix': 'eslint . --ext .ts,.tsx --fix',
    typecheck: 'tsc --noEmit',
  },
  service: {
    build: 'tsc',
    dev: 'tsx watch src/index.ts',
    start: 'node dist/index.js',
    test: 'jest',
    'test:watch': 'jest --watch',
    'test:coverage': 'jest --coverage',
    lint: 'eslint src --ext .ts',
    'lint:fix': 'eslint src --ext .ts --fix',
    typecheck: 'tsc --noEmit',
  },
  library: {
    build: 'tsc -p tsconfig.build.json',
    test: 'jest',
    'test:watch': 'jest --watch',
    'test:coverage': 'jest --coverage',
    lint: 'eslint src --ext .ts',
    'lint:fix': 'eslint src --ext .ts --fix',
    typecheck: 'tsc --noEmit',
  },
};

const DRY_RUN = process.argv.includes('--dry-run');
const VERBOSE = process.argv.includes('--verbose');

function findPackageJsonFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      if (
        !file.startsWith('.') &&
        file !== 'node_modules' &&
        file !== 'dist' &&
        file !== 'build' &&
        file !== 'coverage' &&
        file !== 'archive'
      ) {
        findPackageJsonFiles(filePath, fileList);
      }
    } else if (file === 'package.json') {
      fileList.push(filePath);
    }
  });

  return fileList;
}

function categorizePackage(pkgPath, pkg) {
  const relativePath = path.relative(ROOT_DIR, path.dirname(pkgPath));

  if (relativePath.startsWith('apps/')) return 'app';
  if (relativePath.startsWith('services/')) return 'service';
  if (relativePath.startsWith('packages/')) return 'library';

  if (pkg.scripts?.dev || pkg.scripts?.start) return 'app';
  return 'library';
}

function detectBuildTool(pkgPath, pkg) {
  const dir = path.dirname(pkgPath);
  const hasViteConfig =
    fs.existsSync(path.join(dir, 'vite.config.ts')) ||
    fs.existsSync(path.join(dir, 'vite.config.js'));
  const hasWebpack =
    fs.existsSync(path.join(dir, 'webpack.config.js')) ||
    pkg.devDependencies?.webpack;
  const hasTsConfig = fs.existsSync(path.join(dir, 'tsconfig.json'));

  return { hasViteConfig, hasWebpack, hasTsConfig };
}

function normalizePackage(pkgPath) {
  const content = fs.readFileSync(pkgPath, 'utf8');
  const pkg = JSON.parse(content);

  // Skip root package
  if (pkgPath === path.join(ROOT_DIR, 'package.json')) {
    return { path: pkgPath, changed: false, reason: 'root package' };
  }

  const category = categorizePackage(pkgPath, pkg);
  const templates = SCRIPT_TEMPLATES[category];
  const buildTools = detectBuildTool(pkgPath, pkg);

  // Initialize scripts object if it doesn't exist
  if (!pkg.scripts) {
    pkg.scripts = {};
  }

  const before = { ...pkg.scripts };
  let changeCount = 0;

  // Add missing scripts
  Object.entries(templates).forEach(([scriptName, scriptCommand]) => {
    if (!pkg.scripts[scriptName]) {
      // Customize script based on detected tools
      let command = scriptCommand;

      // Customize build command
      if (scriptName === 'build' && category === 'app') {
        if (buildTools.hasViteConfig) {
          command = pkg.scripts.prebuild
            ? 'tsc && vite build'
            : 'vite build';
        } else if (buildTools.hasWebpack) {
          command = 'webpack --mode production';
        } else if (buildTools.hasTsConfig) {
          command = 'tsc';
        }
      }

      // Customize dev command for apps
      if (scriptName === 'dev' && category === 'app') {
        if (buildTools.hasViteConfig) {
          command = 'vite --host 0.0.0.0';
        } else if (pkg.dependencies?.['@types/node']) {
          command = 'tsx watch src/index.ts';
        }
      }

      // Customize test command based on test runner
      if (scriptName === 'test') {
        if (pkg.devDependencies?.vitest) {
          command = 'vitest run';
        } else if (pkg.devDependencies?.jest || pkg.devDependencies?.['@types/jest']) {
          command = 'jest';
        }
      }

      // Only add if the package has relevant source files
      const dir = path.dirname(pkgPath);
      const hasSrc = fs.existsSync(path.join(dir, 'src'));
      const hasTests =
        fs.existsSync(path.join(dir, '__tests__')) ||
        fs.existsSync(path.join(dir, 'tests')) ||
        fs.existsSync(path.join(dir, 'test'));

      // Skip test scripts if no test directory exists
      if (
        scriptName.includes('test') &&
        !hasTests &&
        !pkg.devDependencies?.jest &&
        !pkg.devDependencies?.vitest
      ) {
        return;
      }

      // Skip dev scripts for libraries without dev capability
      if (
        scriptName === 'dev' &&
        category === 'library' &&
        !pkg.scripts?.dev
      ) {
        return;
      }

      pkg.scripts[scriptName] = command;
      changeCount++;
    }
  });

  // Sort scripts alphabetically
  const sortedScripts = {};
  Object.keys(pkg.scripts)
    .sort()
    .forEach((key) => {
      sortedScripts[key] = pkg.scripts[key];
    });
  pkg.scripts = sortedScripts;

  const changed = changeCount > 0;

  if (changed && !DRY_RUN) {
    // Preserve original formatting as much as possible
    const formatted = JSON.stringify(pkg, null, 2) + '\n';
    fs.writeFileSync(pkgPath, formatted);
  }

  return {
    path: path.relative(ROOT_DIR, pkgPath),
    name: pkg.name,
    category,
    changed,
    changeCount,
    addedScripts: changed
      ? Object.keys(pkg.scripts).filter((key) => !before[key])
      : [],
  };
}

// Main execution
console.log(`\n${DRY_RUN ? '[DRY RUN] ' : ''}Normalizing package scripts...\n`);

const packageFiles = findPackageJsonFiles(ROOT_DIR);
const results = packageFiles.map(normalizePackage);

const changed = results.filter((r) => r.changed);
const unchanged = results.filter((r) => !r.changed);

console.log(`✓ Processed ${results.length} packages`);
console.log(`  ${changed.length} packages updated`);
console.log(`  ${unchanged.length} packages unchanged`);

if (VERBOSE && changed.length > 0) {
  console.log('\nUpdated packages:');
  changed.forEach((result) => {
    console.log(`\n  ${result.path} (${result.category})`);
    console.log(`    Added: ${result.addedScripts.join(', ')}`);
  });
}

if (DRY_RUN) {
  console.log(
    '\n⚠️  DRY RUN MODE - No files were modified. Run without --dry-run to apply changes.\n'
  );
} else {
  console.log('\n✓ All packages normalized\n');
}

process.exit(0);
