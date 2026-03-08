#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const wallet_1 = require("./wallet");
const bundlePath = process.argv[2];
const pubPath = process.argv[3] || process.env.PUBLIC_KEY_FILE || './public.pem';
if (!bundlePath) {
    console.error('Usage: kpw-verify <bundle.json> [publicKey.pem]');
    process.exit(2);
}
const bundle = JSON.parse(fs_1.default.readFileSync(bundlePath, 'utf8'));
const pub = fs_1.default.readFileSync(pubPath, 'utf8');
const ok = (0, wallet_1.verifyDisclosure)(bundle, pub);
console.log(ok ? '✅ KPW bundle verified' : '❌ Verification failed');
process.exit(ok ? 0 : 1);
