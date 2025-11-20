#!/usr/bin/env node
import fs from 'fs';
import { verifyDisclosure } from './wallet';
const bundlePath = process.argv[2];
const pubPath = process.argv[3] || process.env.PUBLIC_KEY_FILE || './public.pem';
if (!bundlePath) {
    console.error('Usage: kpw-verify <bundle.json> [publicKey.pem]');
    process.exit(2);
}
const bundle = JSON.parse(fs.readFileSync(bundlePath, 'utf8'));
const pub = fs.readFileSync(pubPath, 'utf8');
const ok = verifyDisclosure(bundle, pub);
console.log(ok ? '✅ KPW bundle verified' : '❌ Verification failed');
process.exit(ok ? 0 : 1);
