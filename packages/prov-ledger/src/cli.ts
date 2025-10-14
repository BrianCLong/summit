#!/usr/bin/env node
import fs from 'fs';
import { verifyDisclosure } from './wallet';

const pub = process.env.PUBLIC_KEY_PEM || fs.readFileSync(process.env.PUBLIC_KEY_FILE || './public.pem','utf8');
const file = process.argv[2];
if (!file) { console.error('Usage: prov-verify <bundle.json>'); process.exit(2); }
const bundle = JSON.parse(fs.readFileSync(file,'utf8'));
const ok = verifyDisclosure(bundle, pub);
console.log(ok ? '✅ Selective disclosure verified' : '❌ Verification failed');
process.exit(ok ? 0 : 1);