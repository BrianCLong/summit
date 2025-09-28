#!/usr/bin/env node
import fs from 'fs'; import { verify } from './crypto';
const aerPath = process.argv[2]; const pub = process.argv[3] || process.env.AER_PUBLIC_KEY_FILE || './aer.pub.pem';
if (!aerPath) { console.error('Usage: aer-verify <aer.json> [pubKey.pem]'); process.exit(2); }
const aer = JSON.parse(fs.readFileSync(aerPath,'utf8'));
const ok = verify(aer, fs.readFileSync(pub,'utf8'));
console.log(ok ? '✅ AER verified' : '❌ AER invalid'); process.exit(ok?0:1);