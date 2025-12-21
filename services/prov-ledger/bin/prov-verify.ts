#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { verifyDetachedJws } from '../src/sign';
import { verifyManifest } from '../src/verify';

function readFileSafe(filePath: string) {
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) throw new Error(`missing_file:${resolved}`);
  return fs.readFileSync(resolved, 'utf8');
}

try {
  const [, , manifestPath, jwsPath, pubKeyPath] = process.argv;
  if (!manifestPath || !jwsPath || !pubKeyPath) {
    console.error('usage: prov-verify <manifest.json> <jws.txt> <pub.pem>');
    process.exit(2);
  }

  const manifestRaw = readFileSafe(manifestPath);
  const manifestB64 = Buffer.from(manifestRaw).toString('base64');
  const jws = readFileSafe(jwsPath).trim();
  const pub = readFileSafe(pubKeyPath);
  const okSig = verifyDetachedJws(manifestB64, jws, pub);
  if (!okSig) {
    console.error('Signature invalid');
    process.exit(1);
  }
  const man = JSON.parse(manifestRaw);
  verifyManifest(man);
  console.log('OK');
} catch (err) {
  console.error((err as Error).message);
  process.exit(1);
}
