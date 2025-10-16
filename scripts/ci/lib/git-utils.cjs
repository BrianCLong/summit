const { execSync } = require('node:child_process');
const path = require('node:path');

function runGitCommand(args) {
  try {
    const output = execSync(`git ${args}`, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return output.toString().trim();
  } catch (error) {
    const stderr = error.stderr ? error.stderr.toString() : error.message;
    throw new Error(`git ${args} failed: ${stderr}`);
  }
}

function getChangedFiles(baseRef) {
  const diffRange = `${baseRef}...HEAD`;
  const result = runGitCommand(`diff --name-only ${diffRange}`);
  if (!result) {
    return [];
  }
  return result
    .split('\n')
    .map((filePath) => filePath.trim())
    .filter(Boolean);
}

function getAddedLineNumbers(baseRef, filePath) {
  const diffRange = `${baseRef}...HEAD`;
  const diffOutput = runGitCommand(
    `diff --unified=0 --no-color ${diffRange} -- ${escapePath(filePath)}`,
  );
  if (!diffOutput) {
    return new Set();
  }
  const addedLines = new Set();
  const hunkRegex = /@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/g;
  let match;
  while ((match = hunkRegex.exec(diffOutput)) !== null) {
    const start = Number.parseInt(match[1], 10);
    const count = match[2] ? Number.parseInt(match[2], 10) : 1;
    const lineCount = Number.isNaN(count) ? 1 : Math.max(count, 1);
    for (let offset = 0; offset < lineCount; offset += 1) {
      addedLines.add(start + offset);
    }
  }
  return addedLines;
}

function escapePath(filePath) {
  return path
    .normalize(filePath)
    .replace(/\\\\/g, '/')
    .replace(/([ #$&'()*;?\[\]`{}~])/g, '\\$1');
}

function resolveWorkspacePath(relativePath) {
  return path.join(process.cwd(), relativePath);
}

module.exports = {
  getChangedFiles,
  getAddedLineNumbers,
  resolveWorkspacePath,
};
