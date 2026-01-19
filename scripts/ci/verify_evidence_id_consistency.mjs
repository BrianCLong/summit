#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const args = process.argv.slice(2);
const mapIdx = args.indexOf('--map');
if (mapIdx === -1) throw new Error('Missing --map');
const mapPath = args[mapIdx + 1];

const compareCodepoint = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
const ids = Object.keys(map).sort(compareCodepoint);

const seen = new Set();
for (const id of ids) {
  if (seen.has(id)) throw new Error(`Duplicate Evidence ID: ${id}`);
  seen.add(id);

  const rel = map[id].path;
  const abs = path.resolve(path.dirname(mapPath), rel);
  if (!fs.existsSync(abs)) throw new Error(`Missing artifact for ${id}: ${rel}`);

  const buf = fs.readFileSync(abs);
  const got = sha256(buf);
  const exp = map[id].sha256;
  if (got !== exp) throw new Error(`Hash mismatch for ${id}: ${got} != ${exp}`);
}
