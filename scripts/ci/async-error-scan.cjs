const fs = require('node:fs');
const ts = require('typescript');
const { createResult } = require('./lib/reporting.cjs');
const { getAddedLineNumbers, getChangedFiles } = require('./lib/git-utils.cjs');

const SOURCE_EXTENSIONS = /(\.tsx?|\.jsx?)$/i;
const SAFE_PROMISE_IDENTIFIERS = ['allSettled'];

function runAsyncAwaitScan({ baseRef }) {
  const description =
    'Verifies async/await usage includes error handling through try/catch or explicit catch chains.';
  const remediation =
    'Wrap awaited calls in try/catch blocks or append a .catch handler so errors cannot escape silently.';
  const changedFiles = getChangedFiles(baseRef).filter(isCandidateFile);
  const violations = [];
  for (const filePath of changedFiles) {
    const addedLines = getAddedLineNumbers(baseRef, filePath);
    if (addedLines.size === 0) {
      continue;
    }
    const content = fs.readFileSync(filePath, 'utf8');
    const issues = findUnhandledAwaitExpressions(content, addedLines, filePath);
    if (issues.length > 0) {
      violations.push({ filePath, issues });
    }
  }
  if (violations.length === 0) {
    return createResult({
      name: 'async-error-scan',
      description,
      passed: true,
      details: ['All new async operations include error handling.'],
      remediation,
    });
  }
  const details = violations.map((violation) => {
    const formatted = violation.issues
      .map((issue) => `line ${issue.line}: ${issue.message}`)
      .join('; ');
    return `${violation.filePath} → ${formatted}`;
  });
  return createResult({
    name: 'async-error-scan',
    description,
    passed: false,
    details,
    remediation,
  });
}

function findUnhandledAwaitExpressions(
  sourceText,
  addedLines,
  filePath = 'unknown',
) {
  const sourceFile = ts.createSourceFile(
    filePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const violations = [];
  const visit = (node, ancestors) => {
    if (ts.isAwaitExpression(node)) {
      const { line } = sourceFile.getLineAndCharacterOfPosition(
        node.getStart(),
      );
      const oneBasedLine = line + 1;
      if (
        addedLines.has(oneBasedLine) &&
        !isAwaitHandled(node, ancestors, sourceFile)
      ) {
        violations.push({
          line: oneBasedLine,
          message:
            'awaited call is missing try/catch coverage or a chained catch handler.',
        });
      }
    }
    ts.forEachChild(node, (child) => visit(child, ancestors.concat(node)));
  };
  visit(sourceFile, []);
  return violations;
}

function isCandidateFile(filePath) {
  const normalized = filePath.replace(/\\\\/g, '/');
  if (!SOURCE_EXTENSIONS.test(normalized)) {
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
  return true;
}

function isAwaitHandled(node, ancestors, sourceFile) {
  if (hasCatchHandler(node, sourceFile)) {
    return true;
  }
  for (const ancestor of ancestors) {
    if (ts.isTryStatement(ancestor)) {
      if (
        node.getStart() >= ancestor.tryBlock.getStart() &&
        node.getEnd() <= ancestor.tryBlock.getEnd()
      ) {
        return true;
      }
    }
  }
  return false;
}

function hasCatchHandler(node, sourceFile) {
  let expression = node.expression;
  while (ts.isCallExpression(expression)) {
    if (ts.isPropertyAccessExpression(expression.expression)) {
      const property = expression.expression.name;
      if (ts.isIdentifier(property)) {
        const name = property.text;
        if (name === 'catch') {
          return true;
        }
        if (name === 'then' && expression.arguments.length >= 2) {
          return true;
        }
        if (SAFE_PROMISE_IDENTIFIERS.includes(name)) {
          return true;
        }
      }
      expression = expression.expression.expression;
      continue;
    }
    if (ts.isIdentifier(expression.expression)) {
      const identifier = expression.expression.text;
      if (SAFE_PROMISE_IDENTIFIERS.includes(identifier)) {
        return true;
      }
    }
    break;
  }
  if (ts.isPropertyAccessExpression(expression)) {
    const name = expression.name;
    if (ts.isIdentifier(name) && SAFE_PROMISE_IDENTIFIERS.includes(name.text)) {
      return true;
    }
  }
  if (
    ts.isIdentifier(expression) &&
    SAFE_PROMISE_IDENTIFIERS.includes(expression.text)
  ) {
    return true;
  }
  return false;
}

module.exports = {
  runAsyncAwaitScan,
  findUnhandledAwaitExpressions,
};
