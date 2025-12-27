'use strict';

const path = require('path');
const { readFileSync } = require('fs');
const { walkLockfiles } = require('./scanner');
const {
  parsePackageLock,
  parsePnpmLockText,
  parseRequirementsFile,
} = require('./parsers');

function mergeFindings(target, source) {
  target.unpinned.push(...source.unpinned);
  target.risky.push(...source.risky);
  target.versions.push(...source.versions);
  return target;
}

function buildDuplicateMajors(versions) {
  const majors = new Map();
  versions.forEach(({ name, version, source }) => {
    const major = version.split('.')[0];
    if (!major) {
      return;
    }
    if (!majors.has(name)) {
      majors.set(name, new Map());
    }
    const entry = majors.get(name);
    if (!entry.has(major)) {
      entry.set(major, new Set());
    }
    entry.get(major).add(source);
  });

  const duplicates = [];
  for (const [name, majorMap] of majors.entries()) {
    if (majorMap.size > 1) {
      duplicates.push({
        name,
        majors: Array.from(majorMap.keys()).sort(),
        sources: Array.from(new Set(Array.from(majorMap.values()).flatMap((s) => Array.from(s)))).sort(),
      });
    }
  }
  return duplicates.sort((a, b) => a.name.localeCompare(b.name));
}

async function scanDependencyDrift({ rootDir }) {
  const findings = {
    scannedAt: new Date().toISOString(),
    rootDir,
    unpinned: [],
    risky: [],
    versions: [],
  };

  const lockfiles = await walkLockfiles(rootDir);
  lockfiles.forEach((lockfile) => {
    const contents = readFileSync(lockfile, 'utf8');
    const relativePath = path.relative(rootDir, lockfile);
    let parsed = { unpinned: [], risky: [], versions: [] };

    if (lockfile.endsWith('pnpm-lock.yaml')) {
      parsed = parsePnpmLockText(contents, relativePath);
    } else if (lockfile.endsWith('package-lock.json')) {
      parsed = parsePackageLock(JSON.parse(contents), relativePath);
    } else {
      parsed = parseRequirementsFile(contents, relativePath);
    }
    mergeFindings(findings, parsed);
  });

  const duplicates = buildDuplicateMajors(findings.versions);

  return {
    scannedAt: findings.scannedAt,
    rootDir,
    lockfiles: lockfiles.map((file) => path.relative(rootDir, file)).sort(),
    unpinned: findings.unpinned,
    risky: findings.risky,
    duplicates,
  };
}

function renderMarkdownReport(report) {
  const lines = [];
  lines.push('# Dependency Drift Report');
  lines.push('');
  lines.push(`Generated: ${report.scannedAt}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Lockfiles scanned: ${report.lockfiles.length}`);
  lines.push(`- Unpinned dependencies: ${report.unpinned.length}`);
  lines.push(`- Risky dependency specs: ${report.risky.length}`);
  lines.push(`- Duplicate major versions: ${report.duplicates.length}`);
  lines.push('');

  lines.push('## Lockfiles');
  lines.push('');
  report.lockfiles.forEach((file) => lines.push(`- ${file}`));
  lines.push('');

  lines.push('## Unpinned Versions');
  lines.push('');
  if (report.unpinned.length === 0) {
    lines.push('- None detected.');
  } else {
    report.unpinned.forEach((item) => {
      lines.push(
        `- ${item.name} (${item.spec}) in ${item.source} (${item.file})`,
      );
    });
  }
  lines.push('');

  lines.push('## Risky Dependency Specs');
  lines.push('');
  if (report.risky.length === 0) {
    lines.push('- None detected.');
  } else {
    report.risky.forEach((item) => {
      lines.push(
        `- ${item.name} (${item.spec}) in ${item.source} (${item.file})`,
      );
    });
  }
  lines.push('');

  lines.push('## Duplicate Major Versions');
  lines.push('');
  if (report.duplicates.length === 0) {
    lines.push('- None detected.');
  } else {
    report.duplicates.forEach((item) => {
      lines.push(
        `- ${item.name}: majors ${item.majors.join(
          ', ',
        )} (sources: ${item.sources.join(', ')})`,
      );
    });
  }
  lines.push('');

  return lines.join('\n');
}

module.exports = {
  scanDependencyDrift,
  renderMarkdownReport,
  buildDuplicateMajors,
};
