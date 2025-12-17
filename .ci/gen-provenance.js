#!/usr/bin/env node
const fs = require('fs');
const crypto = require('crypto');

function sha256(path) {
  const buf = fs.readFileSync(path);
  return crypto.createHash('sha256').update(buf).digest('hex');
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
      require('child_process').execSync('git rev-parse HEAD').toString().trim(),
    branch:
      process.env.GITHUB_REF_NAME ||
      require('child_process')
        .execSync('git rev-parse --abbrev-ref HEAD')
        .toString()
        .trim(),
  },
  artifacts: files.map((f) => ({ path: f, sha256: sha256(f) })),
};

process.stdout.write(JSON.stringify(manifest, null, 2));
