import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const workspaceFile = path.join(repoRoot, 'pnpm-workspace.yaml');
const lockfilePath = path.join(repoRoot, 'pnpm-lock.yaml');

function normalizePath(value) {
  return value.split(path.sep).join('/');
}

function globToRegex(pattern) {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '___DOUBLESTAR___')
    .replace(/\*/g, '[^/]*')
    .replace(/___DOUBLESTAR___/g, '.*');
  return new RegExp(`^${escaped}$`);
}

function readWorkspaceConfig() {
  const text = fs.readFileSync(workspaceFile, 'utf8');
  const packages = [];
  const exclude = [];
  let mode = null;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }
    if (line === 'packages:') {
      mode = 'packages';
      continue;
    }
    if (line === 'exclude:') {
      mode = 'exclude';
      continue;
    }
    if (mode && line.startsWith('- ')) {
      const value = line.slice(2).trim().replace(/^['"]|['"]$/g, '');
      if (mode === 'packages') {
        packages.push(value);
      } else {
        exclude.push(value);
      }
    }
  }

  return { packages, exclude };
}

function isExcluded(relPath, excludes) {
  for (const entry of excludes) {
    if (entry.startsWith('!')) {
      continue;
    }
    if (entry.endsWith('/**')) {
      const prefix = entry.slice(0, -3);
      if (relPath === prefix || relPath.startsWith(`${prefix}/`)) {
        return true;
      }
      continue;
    }
    if (entry.includes('*')) {
      const regex = globToRegex(entry);
      if (regex.test(relPath)) {
        return true;
      }
      continue;
    }
    if (relPath === entry) {
      return true;
    }
  }
  return false;
}

function matchSegment(pattern, name) {
  if (pattern === '*') {
    return !name.startsWith('.');
  }
  if (pattern.includes('*')) {
    const regex = globToRegex(pattern);
    return regex.test(name);
  }
  return pattern === name;
}

function expandPattern(pattern) {
  const segments = pattern.split('/').filter(Boolean);
  let current = ['.'];

  for (const segment of segments) {
    const next = [];
    if (segment.includes('*')) {
      for (const base of current) {
        const absBase = path.join(repoRoot, base);
        if (!fs.existsSync(absBase)) {
          continue;
        }
        for (const entry of fs.readdirSync(absBase, { withFileTypes: true })) {
          if (!entry.isDirectory()) {
            continue;
          }
          if (!matchSegment(segment, entry.name)) {
            continue;
          }
          next.push(path.join(base, entry.name));
        }
      }
    } else {
      for (const base of current) {
        const candidate = path.join(base, segment);
        const absCandidate = path.join(repoRoot, candidate);
        if (fs.existsSync(absCandidate)) {
          next.push(candidate);
        }
      }
    }
    current = next;
  }

  return current.map((value) => normalizePath(value));
}

function collectWorkspaceDirs(patterns, excludes) {
  const dirs = new Set();

  for (const pattern of patterns) {
    for (const match of expandPattern(pattern)) {
      if (isExcluded(match, excludes)) {
        continue;
      }
      const abs = path.join(repoRoot, match);
      if (!fs.existsSync(abs)) {
        continue;
      }
      const pkgPath = path.join(abs, 'package.json');
      if (!fs.existsSync(pkgPath)) {
        continue;
      }
      dirs.add(match);
    }
  }

  return Array.from(dirs).sort();
}

function parseImporters() {
  if (!fs.existsSync(lockfilePath)) {
    return { exists: false, importers: new Set() };
  }
  const text = fs.readFileSync(lockfilePath, 'utf8');
  const lines = text.split(/\r?\n/);
  const importers = new Set();
  let inImporters = false;

  for (const line of lines) {
    if (!inImporters) {
      if (line.startsWith('importers:')) {
        inImporters = true;
      }
      continue;
    }

    if (line.trim() === '') {
      continue;
    }

    if (!line.startsWith('  ')) {
      break;
    }

    if (line.startsWith('    ')) {
      continue;
    }

    const match = line.match(/^  ("?)(.+?)\1:\s*(\{\})?\s*$/);
    if (match) {
      importers.add(match[2]);
    }
  }

  return { exists: true, importers };
}

function loadPackageJson(relPath) {
  const absPath = path.join(repoRoot, relPath, 'package.json');
  const contents = fs.readFileSync(absPath, 'utf8');
  return JSON.parse(contents);
}

function collectDependencies(pkg) {
  const fields = [
    'dependencies',
    'devDependencies',
    'peerDependencies',
    'optionalDependencies',
  ];
  const entries = [];
  for (const field of fields) {
    const deps = pkg[field];
    if (!deps || typeof deps !== 'object') {
      continue;
    }
    for (const [name, spec] of Object.entries(deps)) {
      entries.push({ field, name, spec });
    }
  }
  return entries;
}

const errors = [];
const { packages: workspacePatterns, exclude } = readWorkspaceConfig();
const workspaceDirs = collectWorkspaceDirs(workspacePatterns, exclude);
const importers = parseImporters();

if (!importers.exists) {
  errors.push('LOCKFILE_MISSING: pnpm-lock.yaml does not exist');
}

if (importers.exists) {
  for (const workspaceDir of workspaceDirs) {
    if (!importers.importers.has(workspaceDir)) {
      errors.push(`LOCKFILE_MISSING_IMPORTER: ${workspaceDir}`);
    }
  }
}

const packageNames = new Map();
const internalNames = new Set();

for (const workspaceDir of workspaceDirs) {
  let pkg;
  try {
    pkg = loadPackageJson(workspaceDir);
  } catch (error) {
    errors.push(`PACKAGE_JSON_INVALID: ${workspaceDir}`);
    continue;
  }

  const name = pkg.name;
  const version = pkg.version;
  if (!name || typeof name !== 'string') {
    errors.push(`PACKAGE_NAME_MISSING: ${workspaceDir}`);
  } else {
    internalNames.add(name);
    if (!packageNames.has(name)) {
      packageNames.set(name, []);
    }
    packageNames.get(name).push(workspaceDir);
  }

  if (!version || typeof version !== 'string') {
    errors.push(`PACKAGE_VERSION_MISSING: ${workspaceDir}`);
  }
}

for (const [name, paths] of packageNames.entries()) {
  if (paths.length > 1) {
    errors.push(`DUPLICATE_PACKAGE_NAME: ${name} (${paths.sort().join(', ')})`);
  }
}

for (const workspaceDir of workspaceDirs) {
  let pkg;
  try {
    pkg = loadPackageJson(workspaceDir);
  } catch {
    continue;
  }

  for (const { field, name, spec } of collectDependencies(pkg)) {
    if (!internalNames.has(name)) {
      continue;
    }
    if (typeof spec !== 'string') {
      errors.push(
        `WORKSPACE_DEP_INVALID: ${workspaceDir} ${field} ${name} (non-string)`
      );
      continue;
    }
    if (!spec.startsWith('workspace:')) {
      errors.push(
        `WORKSPACE_DEP_MISSING_PROTOCOL: ${workspaceDir} ${field} ${name} -> ${spec}`
      );
    }
  }
}

if (errors.length > 0) {
  const sorted = errors.sort((a, b) => a.localeCompare(b));
  console.error('pnpm workspace hygiene violations:');
  for (const line of sorted) {
    console.error(`- ${line}`);
  }
  process.exit(1);
}

console.log(
  `pnpm workspace hygiene ok (${workspaceDirs.length} workspaces checked).`
);
