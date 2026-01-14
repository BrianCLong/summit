import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const ROOT_DIR = path.resolve(__dirname, '../..');

export const readText = (filePath) => fs.readFileSync(filePath, 'utf8');

export const readJson = (filePath) => JSON.parse(readText(filePath));

export const readPolicy = (policyPath) => {
  const contents = readText(policyPath);
  return JSON.parse(contents);
};

const sortValue = (value) => {
  if (Array.isArray(value)) {
    return value.map(sortValue);
  }
  if (value && typeof value === 'object') {
    return Object.keys(value)
      .sort()
      .reduce((acc, key) => {
        acc[key] = sortValue(value[key]);
        return acc;
      }, {});
  }
  return value;
};

export const stableStringify = (value) =>
  `${JSON.stringify(sortValue(value), null, 2)}\n`;

export const writeJson = (filePath, value) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, stableStringify(value));
};

export const sha256 = (content) =>
  crypto.createHash('sha256').update(content).digest('hex');

export const sha256File = (filePath) => {
  const buffer = fs.readFileSync(filePath);
  return sha256(buffer);
};

export const fileSize = (filePath) => fs.statSync(filePath).size;

export const normalizePath = (filePath) =>
  filePath.split(path.sep).join('/');

export const resolveWorkspacePaths = (patterns) => {
  const workspacePaths = new Set();

  const addWorkspace = (workspacePath) => {
    const packageJsonPath = path.join(ROOT_DIR, workspacePath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      workspacePaths.add(normalizePath(workspacePath));
    }
  };

  for (const pattern of patterns) {
    if (pattern.includes('*')) {
      const [base] = pattern.split('*');
      const baseDir = path.resolve(ROOT_DIR, base);
      if (!fs.existsSync(baseDir)) {
        continue;
      }
      const entries = fs.readdirSync(baseDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          addWorkspace(path.join(base, entry.name));
        }
      }
      continue;
    }
    addWorkspace(pattern);
  }

  return Array.from(workspacePaths).sort();
};

export const normalizeWorkspaceId = (workspaceName, workspacePath) => {
  if (workspaceName) {
    return workspaceName
      .replace(/^@/, '')
      .replace(/\//g, '__')
      .replace(/[^a-zA-Z0-9_.-]/g, '-');
  }
  return normalizePath(workspacePath).replace(/\//g, '__');
};

export const collectFiles = (baseDir, patterns) => {
  const matches = new Set();
  const hasGlob = (value) => /[*?]/.test(value);
  const escapeRegex = (value) => value.replace(/[.+^${}()|[\]\\]/g, '\\$&');

  const globToRegex = (pattern) => {
    let regex = '^';
    let index = 0;
    while (index < pattern.length) {
      const char = pattern[index];
      if (char === '*') {
        if (pattern[index + 1] === '*') {
          regex += '.*';
          index += 2;
          continue;
        }
        regex += '[^/]*';
        index += 1;
        continue;
      }
      if (char === '?') {
        regex += '.';
        index += 1;
        continue;
      }
      regex += escapeRegex(char);
      index += 1;
    }
    regex += '$';
    return new RegExp(regex);
  };

  const walk = (dir) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile()) {
        matches.add(fullPath);
      }
    }
  };

  for (const pattern of patterns) {
    if (!hasGlob(pattern)) {
      const absPath = path.resolve(baseDir, pattern);
      if (fs.existsSync(absPath)) {
        matches.add(absPath);
      }
      continue;
    }

    const globBase = pattern.split(/[*?]/)[0];
    const absBase = path.resolve(baseDir, globBase || '.');
    if (!fs.existsSync(absBase)) {
      continue;
    }
    walk(absBase);
  }

  const regexes = patterns.map((pattern) => globToRegex(pattern));

  return Array.from(matches)
    .map((file) => normalizePath(path.relative(baseDir, file)))
    .filter((file) => regexes.some((regex) => regex.test(file)))
    .sort();
};

export const parseArgs = (argv) => {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) {
      continue;
    }
    const key = arg.slice(2);
    const value = argv[i + 1];
    if (value && !value.startsWith('--')) {
      args[key] = value;
      i += 1;
    } else {
      args[key] = true;
    }
  }
  return args;
};

export const ensureEmptyDir = (dirPath) => {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true });
  }
  fs.mkdirSync(dirPath, { recursive: true });
};
