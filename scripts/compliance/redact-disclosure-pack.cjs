const fs = require('fs');
const path = require('path');

const DEFAULT_DENYLIST = path.resolve(
  __dirname,
  '../../compliance/pii-denylist.txt',
);
const DEFAULT_PATTERNS = path.resolve(
  __dirname,
  '../../compliance/secret-patterns.json',
);

const TEXT_EXTENSIONS = new Set([
  '.md',
  '.txt',
  '.json',
  '.yaml',
  '.yml',
  '.csv',
  '.log',
  '.sha256',
  '.spdx',
  '.xml',
]);

const BINARY_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.zip',
  '.gz',
  '.pdf',
  '.tar',
  '.tgz',
]);

function loadDenylist(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'));
}

function loadPatterns(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const patterns = JSON.parse(content);
  if (!Array.isArray(patterns)) {
    throw new Error(`Pattern file must be an array: ${filePath}`);
  }
  return patterns.map((entry) => {
    const flags = entry.flags ?? 'g';
    return {
      name: entry.name ?? 'pattern',
      pattern: entry.pattern,
      replacement: entry.replacement ?? '[REDACTED]',
      regex: new RegExp(entry.pattern, flags),
    };
  });
}

function isTextFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (BINARY_EXTENSIONS.has(ext)) {
    return false;
  }
  if (TEXT_EXTENSIONS.has(ext)) {
    return true;
  }
  return ext.length === 0;
}

function redactContent(content, denylist, patterns) {
  let redacted = content;
  let replacements = 0;

  for (const term of denylist) {
    if (redacted.includes(term)) {
      redacted = redacted.split(term).join('[REDACTED]');
      replacements += 1;
    }
  }

  for (const rule of patterns) {
    rule.regex.lastIndex = 0;
    const updated = redacted.replace(rule.regex, rule.replacement);
    if (updated !== redacted) {
      redacted = updated;
      replacements += 1;
    }
  }

  return { redacted, replacements };
}

function findViolations(content, denylist, patterns) {
  const violations = [];
  for (const term of denylist) {
    if (content.includes(term)) {
      violations.push({ type: 'denylist', value: term });
    }
  }
  for (const rule of patterns) {
    const testRegex = new RegExp(rule.pattern, rule.regex.flags);
    if (testRegex.test(content)) {
      violations.push({ type: 'pattern', value: rule.name });
    }
  }
  return violations;
}

function walk(dir, callback) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(entryPath, callback);
    } else if (entry.isFile()) {
      callback(entryPath);
    }
  }
}

function scanDisclosurePack({ targetDir, denylistPath, patternsPath }) {
  const denylist = loadDenylist(denylistPath ?? DEFAULT_DENYLIST);
  const patterns = loadPatterns(patternsPath ?? DEFAULT_PATTERNS);
  const violations = [];

  walk(targetDir, (filePath) => {
    if (!isTextFile(filePath)) {
      return;
    }
    const content = fs.readFileSync(filePath, 'utf8');
    const matches = findViolations(content, denylist, patterns);
    if (matches.length > 0) {
      violations.push({ filePath, matches });
    }
  });

  return { violations };
}

function redactDisclosurePack({ targetDir, denylistPath, patternsPath }) {
  const denylist = loadDenylist(denylistPath ?? DEFAULT_DENYLIST);
  const patterns = loadPatterns(patternsPath ?? DEFAULT_PATTERNS);
  let redactedFiles = 0;
  const violations = [];

  walk(targetDir, (filePath) => {
    if (!isTextFile(filePath)) {
      return;
    }
    const content = fs.readFileSync(filePath, 'utf8');
    const { redacted, replacements } = redactContent(
      content,
      denylist,
      patterns,
    );
    if (replacements > 0) {
      fs.writeFileSync(filePath, redacted, 'utf8');
      redactedFiles += 1;
    }
    const matches = findViolations(redacted, denylist, patterns);
    if (matches.length > 0) {
      violations.push({ filePath, matches });
    }
  });

  return { redactedFiles, violations };
}

function printUsage() {
  console.log(
    'Usage: node scripts/compliance/redact-disclosure-pack.cjs <pack_dir> [--denylist <path>] [--patterns <path>]',
  );
}

if (require.main === module) {
  const targetDir = process.argv[2];
  if (!targetDir) {
    printUsage();
    process.exit(1);
  }

  const denylistIndex = process.argv.indexOf('--denylist');
  const patternsIndex = process.argv.indexOf('--patterns');
  const denylistPath =
    denylistIndex > -1 ? process.argv[denylistIndex + 1] : undefined;
  const patternsPath =
    patternsIndex > -1 ? process.argv[patternsIndex + 1] : undefined;

  const { redactedFiles, violations } = redactDisclosurePack({
    targetDir,
    denylistPath,
    patternsPath,
  });

  if (violations.length > 0) {
    console.error('[ERROR] Disclosure pack redaction violations found:');
    for (const violation of violations) {
      console.error(`- ${violation.filePath}`);
      for (const match of violation.matches) {
        console.error(`  - ${match.type}: ${match.value}`);
      }
    }
    process.exit(1);
  }

  console.log(`[INFO] Redaction complete. Files updated: ${redactedFiles}`);
}

module.exports = {
  loadDenylist,
  loadPatterns,
  redactContent,
  findViolations,
  scanDisclosurePack,
  redactDisclosurePack,
};
