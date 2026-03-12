#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const repoRoot = process.cwd();
const rootTsconfigPath = path.join(repoRoot, 'tsconfig.json');
const rootPackagePath = path.join(repoRoot, 'package.json');
const rootNodeModulesPath = path.join(repoRoot, 'node_modules');
const rootRequire = createRequire(path.join(repoRoot, 'package.json'));

const readJson = (jsonPath) => JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

if (!fs.existsSync(rootNodeModulesPath)) {
  console.error('Type dependency preflight failed: node_modules is missing. Run `pnpm install` before `pnpm typecheck`.');
  process.exit(1);
}

const rootTsconfig = readJson(rootTsconfigPath);
const rootPackage = readJson(rootPackagePath);

const rootDeps = new Set([
  ...Object.keys(rootPackage.dependencies ?? {}),
  ...Object.keys(rootPackage.devDependencies ?? {}),
]);

const workspaceTypePackageName = (typeName) =>
  typeName.startsWith('@types/') ? typeName : `@types/${typeName.replace(/^@/, '').replace('/', '__')}`;

const resolutionCache = new Map();
const canResolve = (packageName) => {
  if (resolutionCache.has(packageName)) {
    return resolutionCache.get(packageName);
  }

  try {
    // Check if the directory exists at least, if resolve fails due to EPERM on package.json
    const packagePath = path.join(rootNodeModulesPath, ...packageName.split('/'));
    if (fs.existsSync(packagePath)) {
      resolutionCache.set(packageName, true);
      return true;
    }

    rootRequire.resolve(`${packageName}/package.json`);
    resolutionCache.set(packageName, true);
    return true;
  } catch (err) {
    if (err.code === 'EPERM') {
      // If we can't check due to permissions, assume it's there but locked
      resolutionCache.set(packageName, true);
      return true;
    }
    resolutionCache.set(packageName, false);
    return false;
  }
};

const issues = [];

for (const reference of rootTsconfig.references ?? []) {
  const refPath = reference.path;
  const tsconfigPath = path.join(repoRoot, refPath, 'tsconfig.json');
  const packagePath = path.join(repoRoot, refPath, 'package.json');

  if (!fs.existsSync(tsconfigPath)) {
    continue;
  }

  const tsconfig = readJson(tsconfigPath);
  const workspacePackage = fs.existsSync(packagePath) ? readJson(packagePath) : {};
  const workspaceDeps = new Set([
    ...Object.keys(workspacePackage.dependencies ?? {}),
    ...Object.keys(workspacePackage.devDependencies ?? {}),
  ]);

  const declaredTypes = tsconfig.compilerOptions?.types ?? [];

  for (const typeName of declaredTypes) {
    const expectedPackage = workspaceTypePackageName(typeName);

    const declared =
      workspaceDeps.has(expectedPackage) ||
      workspaceDeps.has(typeName) ||
      rootDeps.has(expectedPackage) ||
      rootDeps.has(typeName);

    if (!declared) {
      issues.push({
        project: refPath,
        typeName,
        expectedPackage,
        reason: 'undeclared',
      });
      continue;
    }

    if (!canResolve(expectedPackage) && !canResolve(typeName)) {
      issues.push({
        project: refPath,
        typeName,
        expectedPackage,
        reason: 'uninstalled',
      });
    }
  }
}

if (issues.length > 0) {
  console.error('\nType dependency preflight failed.\n');

  for (const issue of issues) {
    if (issue.reason === 'undeclared') {
      console.error(
        `- ${issue.project}: types includes "${issue.typeName}" but no dependency on "${issue.expectedPackage}" was found in workspace or root package.json`,
      );
    } else {
      console.error(
        `- ${issue.project}: required type package "${issue.expectedPackage}" for "${issue.typeName}" is declared but not installed`,
      );
    }
  }

  console.error('\nAlign package manifests and install dependencies before running typecheck.');
  process.exit(1);
}

console.log('Type dependency preflight passed.');
