#!/usr/bin/env node
const fs = require('fs');
const { createHash } = require('crypto');
const { execSync } = require('child_process');

function sha256(path) {
  const buf = fs.readFileSync(path);
  return createHash('sha256').update(buf).digest('hex');
}

const files = [
  'package.json',
  'pnpm-lock.yaml',
  'dist/server/index.js',
  'dist/client/assets/index.js',
].filter((f) => fs.existsSync(f));

const manifest = {
  schema: 'intelgraph.provenance/v1',
  createdAt: new Date().toISOString(),
  git: {
    commit:
      process.env.GITHUB_SHA ||
      execSync('git rev-parse HEAD').toString().trim(),
    branch:
      process.env.GITHUB_REF_NAME ||
      execSync('git rev-parse --abbrev-ref HEAD')
        .toString()
        .trim(),
  },
  artifacts: files.map((f) => ({ path: f, sha256: sha256(f) })),
};

process.stdout.write(JSON.stringify(manifest, null, 2));