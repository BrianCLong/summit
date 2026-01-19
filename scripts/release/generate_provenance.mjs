#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const args = process.argv.slice(2);
const inIdx = args.indexOf('--in');
const outIdx = args.indexOf('--out');
const IN = args[inIdx+1];
const OUT = args[outIdx+1];
const sign = args.includes('--sign');

fs.mkdirSync(OUT, { recursive: true });

const map = JSON.parse(fs.readFileSync(path.join(IN,'evidence-map.json'),'utf8'));
const digest = crypto.createHash('sha256')
  .update(JSON.stringify(map))
  .digest('hex');

const att = {
  _type: 'https://in-toto.io/Statement/v1',
  subject: [{ name: 'ga-artifact-bundle', digest: { sha256: digest } }],
  predicateType: 'https://slsa.dev/provenance/v1',
  predicate: {
    builder: { id: 'github-actions' },
    buildType: 'summit/ga',
    materials: Object.entries(map).map(([id,v])=>({ uri: id, digest:{ sha256:v.sha256 }}))
  }
};

const out = path.join(OUT, 'provenance.json');
fs.writeFileSync(out, JSON.stringify(att, null, 2));

if (sign) {
  // placeholder for OIDC/KMS signing
  fs.writeFileSync(path.join(OUT,'signature.txt'), 'signed-via-oidc');
}
