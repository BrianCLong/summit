#!/usr/bin/env node
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');

const repoRoot = resolve(__dirname, '..');

const baseConfig = JSON.parse(readFileSync(resolve(repoRoot, 'tsconfig.base.json'), 'utf8'));
const canonicalOptions = baseConfig.compilerOptions ?? {};

const packages = [
  {
    name: 'client',
    configPath: resolve(repoRoot, 'client/tsconfig.json'),
    allowOverrides: new Set([
      'baseUrl',
      'allowJs',
      'noEmit',
    "noImplicitAny",
      'types',
      'typeRoots',
      'jsxImportSource',
      'paths'
    ]),
    requiredInclude: new Set(['src/**/*', 'types/**/*.d.ts']),
    requiredExclude: new Set(['node_modules', 'dist', 'build'])
  },
  {
    name: 'server',
    configPath: resolve(repoRoot, 'server/tsconfig.json'),
    allowOverrides: new Set([
      'baseUrl',
      'module',
      'moduleResolution',
      'rootDir',
      'outDir',
      'downlevelIteration',
      'allowJs',
      'sourceMap',
      'lib',
      'types',
      'paths'
    ]),
    requiredInclude: new Set(['src/**/*', 'src/**/__tests__/**/*', 'tests/**/*', 'health/**/*']),
    requiredExclude: new Set(['node_modules', 'dist'])
  }
];

const errors = [];

function readTsconfig(configPath) {
  const raw = readFileSync(configPath, 'utf8');
  return JSON.parse(raw);
}

function compareOptions(packageName, options) {
  const allowOverrides = packages.find((pkg) => pkg.name === packageName)?.allowOverrides ?? new Set();
  for (const [key, value] of Object.entries(options)) {
    if (allowOverrides.has(key)) continue;
    if (!(key in canonicalOptions)) {
      errors.push(`${packageName}: unexpected compilerOption '${key}'`);
      continue;
    }
    const canonicalValue = canonicalOptions[key];
    const serializedCanonical = JSON.stringify(canonicalValue);
    const serializedValue = JSON.stringify(value);
    if (serializedCanonical !== serializedValue) {
      errors.push(
        `${packageName}: compilerOption '${key}' should match base (${serializedCanonical}) but found ${serializedValue}`
      );
    }
  }
}

function validateIncludes(packageName, fieldName, value, required) {
  const present = new Set(value ?? []);
  required.forEach((item) => {
    if (!present.has(item)) {
      errors.push(`${packageName}: missing ${fieldName} entry '${item}'`);
    }
  });
}

for (const pkg of packages) {
  const config = readTsconfig(pkg.configPath);
  const extendsPath = config.extends;
  if (extendsPath !== '../tsconfig.base.json') {
    errors.push(`${pkg.name}: expected extends to be '../tsconfig.base.json' but found '${extendsPath ?? 'undefined'}'`);
  }
  compareOptions(pkg.name, config.compilerOptions ?? {});
  validateIncludes(pkg.name, 'include', config.include, pkg.requiredInclude);
  validateIncludes(pkg.name, 'exclude', config.exclude, pkg.requiredExclude);
}

if (errors.length > 0) {
  errors.forEach((message) => {
    console.error(`tsconfig drift: ${message}`);
  });
  process.exit(1);
}

console.log('All checked tsconfig files align with the base configuration.');
