#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const YAML = require('yaml');

const manifestPath = process.argv[2];
const chartsDir = process.argv[3];
if (!manifestPath || !chartsDir) {
  console.error('Usage: inject-digest-into-values <manifest.json> <chartsDir>');
  process.exit(1);
}
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const digests = new Map();
for (const it of manifest.images || []) {
  digests.set(it.name, it.digest);
}
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    return d.isDirectory() ? walk(p) : [p];
  });
}
const files = walk(chartsDir).filter((p) => p.endsWith('values.yaml'));
for (const f of files) {
  const doc = YAML.parse(fs.readFileSync(f, 'utf8')) || {};
  const repo = doc.image?.repository;
  if (repo && digests.has(repo)) {
    doc.image = doc.image || {};
    doc.image.tag = '';
    doc.image.digest = digests.get(repo);
    fs.writeFileSync(f, YAML.stringify(doc));
    console.log(`[UPDATED] ${f} -> ${repo}@${doc.image.digest}`);
  }
}
