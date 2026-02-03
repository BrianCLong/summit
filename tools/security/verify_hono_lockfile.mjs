#!/usr/bin/env node
import fs from 'node:fs';

const lockPath = process.argv[2] || 'pnpm-lock.yaml';
const minVersion = '4.11.7';

const parseParts = (version) =>
  version.split('.').map((part) => Number.parseInt(part, 10));

const compareSemver = (left, right) => {
  const leftParts = parseParts(left);
  const rightParts = parseParts(right);
  for (let i = 0; i < 3; i += 1) {
    const leftValue = leftParts[i] ?? 0;
    const rightValue = rightParts[i] ?? 0;
    if (leftValue < rightValue) return -1;
    if (leftValue > rightValue) return 1;
  }
  return 0;
};

const readLockfile = (path) => {
  try {
    return fs.readFileSync(path, 'utf8');
  } catch (error) {
    console.error(`[hono-gate] Unable to read lockfile at ${path}: ${error.message}`);
    process.exit(1);
  }
};

const collectMatches = (text, label, regex) => {
  const versions = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    versions.push(match[1]);
  }
  return { label, versions };
};

const lockfileText = readLockfile(lockPath);

const scans = [
  collectMatches(lockfileText, 'hono', /(?:^|[^\w-])hono@(?:npm:)?(\d+\.\d+\.\d+)\b/gm),
  collectMatches(
    lockfileText,
    'hono/jsx',
    /(?:^|[^\w-])hono\/jsx@(?:npm:)?(\d+\.\d+\.\d+)\b/gm,
  ),
];

const allVersions = scans.flatMap((scan) => scan.versions);

if (allVersions.length === 0) {
  console.error(
    `[hono-gate] No hono@x.y.z entries found in ${lockPath}. Gate cannot verify.`,
  );
  process.exit(1);
}

const uniqueVersions = [...new Set(allVersions)];
const badVersions = uniqueVersions.filter(
  (version) => compareSemver(version, minVersion) < 0,
);

if (badVersions.length > 0) {
  console.error(
    `[hono-gate] Vulnerable hono versions found in ${lockPath}: ${badVersions.join(
      ', ',
    )} (min ${minVersion})`,
  );
  process.exit(1);
}

const perScanReport = scans
  .map((scan) => `${scan.label}=${scan.versions.length}`)
  .join(', ');
console.log(
  `[hono-gate] OK: all detected hono versions are >= ${minVersion} (${perScanReport}).`,
);
