#!/usr/bin/env node
const { readFileSync, readdirSync, statSync, existsSync } = require('fs');
const { resolve, relative } = require('path');
const { execSync } = require('child_process');

function loadWorkspaceGlobs(rootDir) {
  const workspaceFile = resolve(rootDir, 'pnpm-workspace.yaml');
  const content = readFileSync(workspaceFile, 'utf8');
  const lines = content.split(/\r?\n/);
  const packages = [];
  let inPackages = false;
  for (const line of lines) {
    if (line.trim().startsWith('packages:')) {
      inPackages = true;
      continue;
    }
    if (inPackages) {
      if (/^\s*-/.test(line)) {
        const value = line.replace(/^\s*-\s*/, '').trim().replace(/^['"]|['"]$/g, '');
        if (value) packages.push(value);
      } else if (line.trim().length === 0) {
        continue;
      } else if (!/^\s+/.test(line)) {
        break;
      }
    }
  }
  return packages;
}

function expandPattern(rootDir, pattern) {
  const normalized = pattern.replace(/\\/g, '/');
  if (normalized.endsWith('/*')) {
    const base = normalized.slice(0, -2);
    const fullBase = resolve(rootDir, base);
    if (!existsSync(fullBase)) return [];
    return readdirSync(fullBase)
      .map((entry) => resolve(fullBase, entry))
      .filter((p) => statSync(p).isDirectory());
  }
  return [resolve(rootDir, normalized)];
}

function getWorkspaceMap(rootDir) {
  const patterns = loadWorkspaceGlobs(rootDir);
  const workspaceDirs = patterns.flatMap((pattern) => expandPattern(rootDir, pattern));
  const map = new Map();
  workspaceDirs.forEach((dir) => {
    const pkgPath = resolve(dir, 'package.json');
    if (existsSync(pkgPath)) {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
      if (pkg.name) {
        map.set(relative(rootDir, dir), pkg.name);
      }
    }
  });
  return map;
}

function changedFiles(rootDir, baseRef) {
  const range = baseRef ? `${baseRef}...HEAD` : 'origin/main...HEAD';
  const output = execSync(`git diff --name-only ${range}`, { cwd: rootDir, stdio: ['ignore', 'pipe', 'ignore'] }).toString();
  return output
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function detectAffected(rootDir, opts = {}) {
  const map = getWorkspaceMap(rootDir);
  const files = opts.changedFiles || changedFiles(rootDir, opts.baseRef);
  const affected = new Set();

  files.forEach((file) => {
    const normalized = file.replace(/\\/g, '/');
    for (const [workspacePath, name] of map.entries()) {
      if (normalized === workspacePath || normalized.startsWith(`${workspacePath}/`)) {
        affected.add(name);
        break;
      }
    }
    if (normalized === 'package.json' || normalized.startsWith('pnpm-lock.yaml') || normalized.startsWith('turbo.json')) {
      map.forEach((name) => affected.add(name));
    }
  });

  return Array.from(affected).sort();
}

if (require.main === module) {
  const baseRef = process.env.GITHUB_BASE_REF || process.env.CI_BASE_REF;
  try {
    const workspaces = detectAffected(process.cwd(), { baseRef });
    console.log(JSON.stringify({ workspaces }));
  } catch (err) {
    console.error('failed_to_detect_workspaces');
    console.log(JSON.stringify({ workspaces: [] }));
    process.exit(0);
  }
}

module.exports = { detectAffected, getWorkspaceMap, changedFiles, loadWorkspaceGlobs };
