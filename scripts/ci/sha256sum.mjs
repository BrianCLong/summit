#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const target = process.argv[2];

if (!target) {
  console.error('Usage: sha256sum.mjs <file>');
  process.exit(1);
}

const absolute = path.resolve(process.cwd(), target);

if (!fs.existsSync(absolute)) {
  console.error(`File not found: ${absolute}`);
  process.exit(1);
}

const data = fs.readFileSync(absolute);
const hash = crypto.createHash('sha256').update(data).digest('hex');

process.stdout.write(`${hash}\n`);
