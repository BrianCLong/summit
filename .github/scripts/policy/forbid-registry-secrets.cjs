#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const FORBIDDEN_PATTERNS = [
  /\bCODEARTIFACT_AUTH_TOKEN\b/i,
  /\bNPM_TOKEN\b/i,
  /\bJFROG.*TOKEN\b/i,
  /\bAZURE_ARTIFACTS.*TOKEN\b/i,
  /\b_AUTH_TOKEN\b/i,
];

const TARGET_DIRS = [path.join('.github', 'workflows')];
const TARGET_FILES = [
  path.join('.github', 'dependabot.yml'),
  path.join('.github', 'dependabot.yaml'),
];

const REPORT_PATH = path.join('artifacts', 'policy', 'report.json');
const STAMP_PATH = path.join('artifacts', 'policy', 'stamp.json');

function listTargetFiles(rootDir) {
  const files = [];
  for (const dir of TARGET_DIRS) {
    const absoluteDir = path.join(rootDir, dir);
    if (!fs.existsSync(absoluteDir)) {
      continue;
    }
    const entries = fs.readdirSync(absoluteDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile()) {
        continue;
      }
      const ext = path.extname(entry.name).toLowerCase();
      if (ext !== '.yml' && ext !== '.yaml') {
        continue;
      }
      files.push(path.join(absoluteDir, entry.name));
    }
  }

  for (const file of TARGET_FILES) {
    const absoluteFile = path.join(rootDir, file);
    if (fs.existsSync(absoluteFile)) {
      files.push(absoluteFile);
    }
  }

  return files.sort();
}

function findViolationsInContent(content, filePath, patterns) {
  const violations = [];
  const lines = content.split(/\r?\n/);
  lines.forEach((line, index) => {
    patterns.forEach((pattern) => {
      if (pattern.test(line)) {
        violations.push({
          file: filePath,
          line: index + 1,
          pattern: pattern.toString(),
          excerpt: line.trim(),
        });
      }
    });
  });
  return violations;
}

function scanFiles(files, patterns) {
  const allViolations = [];
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const relativeFile = path.relative(process.cwd(), file);
    const violations = findViolationsInContent(content, relativeFile, patterns);
    allViolations.push(...violations);
  }
  return allViolations.sort((a, b) => {
    if (a.file !== b.file) {
      return a.file.localeCompare(b.file);
    }
    if (a.line !== b.line) {
      return a.line - b.line;
    }
    return a.pattern.localeCompare(b.pattern);
  });
}

function ensureOutputDir(filePath) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
}

function resolveGitSha() {
  const envSha = process.env.GITHUB_SHA;
  if (envSha) {
    return envSha;
  }
  try {
    return execSync('git rev-parse --short HEAD', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch (error) {
    return 'unknown';
  }
}

function runPolicy({ rootDir = process.cwd() } = {}) {
  const files = listTargetFiles(rootDir);
  const violations = scanFiles(files, FORBIDDEN_PATTERNS);
  const report = {
    policyId: 'forbid-registry-secrets',
    status: violations.length === 0 ? 'pass' : 'fail',
    scannedFiles: files.map((file) => path.relative(rootDir, file)),
    forbiddenPatterns: FORBIDDEN_PATTERNS.map((pattern) => pattern.toString()),
    violationCount: violations.length,
    violations,
  };

  const stamp = {
    policyId: report.policyId,
    status: report.status,
    gitSha: resolveGitSha(),
  };

  ensureOutputDir(REPORT_PATH);
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
  fs.writeFileSync(STAMP_PATH, JSON.stringify(stamp, null, 2));

  if (violations.length > 0) {
    console.error(
      `Policy ${report.policyId} failed with ${violations.length} violation(s).`,
    );
    violations.forEach((violation) => {
      console.error(
        `${violation.file}:${violation.line} ${violation.pattern} ${violation.excerpt}`,
      );
    });
    process.exitCode = 1;
  } else {
    console.log(`Policy ${report.policyId} passed.`);
  }

  return report;
}

if (require.main === module) {
  runPolicy();
}

module.exports = {
  FORBIDDEN_PATTERNS,
  findViolationsInContent,
  listTargetFiles,
  runPolicy,
  scanFiles,
};
