#!/usr/bin/env node
import * as fs from 'fs';
import { verify } from './crypto';
const aerPath = process.argv[2];
const pub =
  process.argv[3] || process.env.AER_PUBLIC_KEY_FILE || './aer.pub.pem';
if (!aerPath) {
  throw new Error('Usage: aer-verify <aer.json> [pubKey.pem]');
}
const aer = JSON.parse(fs.readFileSync(aerPath, 'utf8'));
const ok = verify(aer, fs.readFileSync(pub, 'utf8'));
if (!ok) {
  throw new Error('AER invalid');
}
