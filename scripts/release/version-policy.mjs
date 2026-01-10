#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const changelogPath = path.resolve('CHANGELOG.md');
const packageJsonPath = path.resolve('package.json');

const changelog = fs.readFileSync(changelogPath, 'utf8');
const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

const unreleasedSection = /^## \[Unreleased\]/m;
if (!unreleasedSection.test(changelog)) {
  console.error('❌ CHANGELOG.md is missing an [Unreleased] section.');
  process.exit(1);
}

const releaseMatch = changelog.match(/^## \[(\d+\.\d+\.\d+)\]/m);
if (!releaseMatch) {
  console.error('❌ CHANGELOG.md does not contain any released versions.');
  process.exit(1);
}

const changelogVersion = releaseMatch[1];
const packageVersion = pkg.version;

if (changelogVersion !== packageVersion) {
  console.error(
    `❌ Version mismatch: package.json is ${packageVersion} but CHANGELOG.md latest release is ${changelogVersion}.`
  );
  process.exit(1);
}

console.log('✅ Version policy check passed.');
console.log(`   Latest release: v${changelogVersion}`);
console.log('   Ensure tags use v<MAJOR.MINOR.PATCH> and Keep a Changelog format.');
