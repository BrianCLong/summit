#!/usr/bin/env node
import fs from 'node:fs';

const outputPath =
  process.argv[2] || 'evidence/out/HONO-ERRBOUNDARY-XSS/stamp.json';

const payload = {
  generated_at: new Date().toISOString(),
  git: {
    sha: process.env.GITHUB_SHA || 'unknown',
    ref: process.env.GITHUB_REF || 'unknown',
  },
};

fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
console.log(`[hono-evidence] stamp written to ${outputPath}`);
