#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

function compareStringsCodepoint(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

function stableClone(value) {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(stableClone);
  if (typeof value !== 'object') return value;

  const keys = Object.keys(value).sort(compareStringsCodepoint);
  const out = {};
  for (const k of keys) out[k] = stableClone(value[k]);
  return out;
}

function stableStringify(value) {
  return JSON.stringify(stableClone(value), null, 2) + '\n';
}

function sha256File(filePath) {
  const data = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(data).digest('hex');
}

function listFilesRecursive(dir) {
  let results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) results = results.concat(listFilesRecursive(p));
    else results.push(p);
  }
  return results;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i += 2) out[args[i].replace(/^--/, '')] = args[i + 1];
  return out;
}

const args = parseArgs();
const dir = args.dir;
const outFile = args.out;

if (!dir || !outFile) {
  console.error('Usage: generate_rebuild_manifest.mjs --dir DIR --out FILE');
  process.exit(1);
}

if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
  console.error(`Not a directory: ${dir}`);
  process.exit(1);
}

const files = listFilesRecursive(dir)
  .map((p) => p)
  .sort(compareStringsCodepoint);

const entries = files.map((f) => ({
  path: path.relative(dir, f).split(path.sep).join('/'),
  sha256: sha256File(f),
}));

const manifest = {
  schemaVersion: '1.0',
  root: path.basename(dir),
  files: entries,
};

fs.writeFileSync(outFile, stableStringify(manifest), 'utf8');
