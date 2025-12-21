#!/usr/bin/env node
import fs from 'fs';
import { verifyDetachedJws } from '../src/sign';
import { verifyManifest } from '../src/verify';

function readRequired(path: string, label: string) {
  if (!fs.existsSync(path)) {
    throw new Error(`${label}_missing`);
  }
  return fs.readFileSync(path);
}

function run() {
  const [, , manifestPath, jwsPath, pubKeyPath] = process.argv;
  if (!manifestPath || !jwsPath || !pubKeyPath) {
    console.error('usage: prov-verify <manifest.json> <jws.txt> <pub.pem>');
    process.exit(2);
  }

  try {
    const manifestBuf = readRequired(manifestPath, 'manifest');
    const manifestB64 = Buffer.from(manifestBuf).toString('base64');
    const jws = readRequired(jwsPath, 'signature').toString('utf8').trim();
    const pub = readRequired(pubKeyPath, 'pubkey').toString('utf8');

    const signatureOk = verifyDetachedJws(manifestB64, jws, pub);
    if (!signatureOk) {
      console.error('Signature invalid');
      process.exit(1);
    }

    const manifest = JSON.parse(manifestBuf.toString('utf8'));
    verifyManifest(manifest);
    console.log('OK');
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown_error';
    console.error(msg);
    process.exit(1);
  }
}

run();
