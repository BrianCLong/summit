const fs = require('node:fs');
const { createResult } = require('./lib/reporting.cjs');
const { getAddedLineNumbers, getChangedFiles } = require('./lib/git-utils.cjs');

const PRODUCTION_DIRECTORIES = [/^src\//, /^client\//, /^apps\//, /^services\//, /^packages\//];

function runConsoleLogScan({ baseRef }) {
  const description = 'Prevents new console.log statements from landing in production code paths.';
  const remediation =
    'Replace console.log with structured logging utilities or remove the statement before committing.';
  const changedFiles = getChangedFiles(baseRef).filter(isRelevantFile);
  const violations = [];
  for (const filePath of changedFiles) {
    const addedLines = getAddedLineNumbers(baseRef, filePath);
    if (addedLines.size === 0) {
      continue;
    }
    const content = fs.readFileSync(filePath, 'utf8');
    const fileViolations = findConsoleLogViolations(content, addedLines);
    if (fileViolations.length > 0) {
      violations.push({ filePath, occurrences: fileViolations });
    }
  }
  if (violations.length === 0) {
    return createResult({
      name: 'console-log-scan',
      description,
      passed: true,
      details: ['No new console.log statements detected in production code.'],
      remediation
    });
  }
  const details = violations.map((violation) => {
    const occurrences = violation.occurrences
      .map((entry) => `line ${entry.line}: ${entry.code.trim()}`)
      .join('; ');
    return `${violation.filePath} → ${occurrences}`;
  });
  return createResult({
    name: 'console-log-scan',
    description,
    passed: false,
    details,
    remediation
  });
}

function findConsoleLogViolations(content, addedLines) {
  const lines = content.split(/\r?\n/);
  const violations = [];
  for (const lineNumber of addedLines) {
    const index = lineNumber - 1;
    if (index < 0 || index >= lines.length) {
      continue;
    }
    const line = lines[index];
    if (/console\.log\s*\(/.test(line)) {
      violations.push({ line: lineNumber, code: line });
    }
  }
  return violations;
}

function isRelevantFile(filePath) {
  const normalized = filePath.replace(/\\\\/g, '/');
  if (!/(\.tsx?|\.jsx?)$/i.test(normalized)) {
    return false;
  }
  if (/\.test\.|\.spec\./i.test(normalized)) {
    return false;
  }
  if (/__tests__/.test(normalized)) {
    return false;
  }
  if (/\/tests\//.test(normalized)) {
    return false;
  }
  return PRODUCTION_DIRECTORIES.some((pattern) => pattern.test(normalized));
}

module.exports = {
  runConsoleLogScan,
  findConsoleLogViolations
};
