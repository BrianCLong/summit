#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable no-console */
const verifier_1 = require("./verifier");
const fs_1 = __importDefault(require("fs"));
const filePath = process.argv[2];
if (!filePath) {
    console.error('Usage: prov-verify <manifest-file>');
    process.exit(1);
}
try {
    const content = fs_1.default.readFileSync(filePath, 'utf-8');
    const manifest = JSON.parse(content);
    const result = verifier_1.Verifier.verifyManifest(manifest);
    if (result.valid) {
        console.log('✅ Manifest verified successfully.');
        process.exit(0);
    }
    else {
        console.error('❌ Manifest verification failed:');
        result.errors.forEach(e => console.error(` - ${e}`));
        process.exit(1);
    }
}
catch (error) {
    console.error('Failed to read or parse manifest:', error);
    process.exit(1);
}
