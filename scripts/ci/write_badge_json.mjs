#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const outputPath = process.env.BADGE_OUTPUT || 'out/evidence/badge.json';
const label = process.env.BADGE_LABEL || 'evidence';
const message = process.env.BADGE_MESSAGE || 'unknown';
const color = process.env.BADGE_COLOR || 'lightgrey';
const labelColor = process.env.BADGE_LABEL_COLOR;
const cacheSeconds = process.env.BADGE_CACHE_SECONDS;

const badge = {
  schemaVersion: 1,
  label,
  message,
  color,
};

if (labelColor) {
  badge.labelColor = labelColor;
}

if (cacheSeconds) {
  const parsed = Number(cacheSeconds);
  if (!Number.isNaN(parsed)) {
    badge.cacheSeconds = parsed;
  }
}

const resolvedPath = path.resolve(outputPath);
fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
fs.writeFileSync(resolvedPath, JSON.stringify(badge, null, 2));

const stampOutput = process.env.BADGE_STAMP_OUTPUT;
if (stampOutput) {
  const stamp = {
    eid: process.env.EVIDENCE_ID || 'EVID-UNKNOWN',
    git_sha: process.env.GIT_SHA || 'UNKNOWN',
    pipeline: process.env.PIPELINE_NAME || 'UNKNOWN',
    inputs_manifest_sha256: process.env.INPUTS_MANIFEST_SHA256 || 'UNKNOWN',
    params_sha256: process.env.PARAMS_SHA256 || 'UNKNOWN',
  };
  const stampPath = path.resolve(stampOutput);
  fs.mkdirSync(path.dirname(stampPath), { recursive: true });
  fs.writeFileSync(stampPath, JSON.stringify(stamp, null, 2));
}

console.log(`Badge JSON written to ${resolvedPath}`);
