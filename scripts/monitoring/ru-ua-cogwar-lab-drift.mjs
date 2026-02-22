#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');

const distDir = path.join(repoRoot, 'dist', 'cogwar');
const currentPath = path.join(distDir, 'stamp.json');
const baselinePath = path.join(distDir, 'stamp.baseline.json');

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function main() {
  if (!fs.existsSync(currentPath)) {
    throw new Error('Missing dist/cogwar/stamp.json; run compile_packs first.');
  }
  if (!fs.existsSync(baselinePath)) {
    throw new Error('Missing dist/cogwar/stamp.baseline.json baseline.');
  }

  const current = loadJson(currentPath);
  const baseline = loadJson(baselinePath);

  if (current.content_sha256 !== baseline.content_sha256) {
    throw new Error(
      `Cogwar pack drift detected: ${baseline.content_sha256} -> ${current.content_sha256}`
    );
  }

  console.log('Cogwar pack drift check: no drift detected.');
}

main();
