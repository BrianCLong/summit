#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_process_1 = __importDefault(require("node:process"));
const linter_js_1 = require("./linter.js");
function parsePatterns(argv) {
    const patternsFlagIndex = argv.findIndex((arg) => arg === '--paths');
    if (patternsFlagIndex === -1) {
        return undefined;
    }
    const value = argv[patternsFlagIndex + 1];
    if (!value)
        return undefined;
    return value.split(',').map((p) => p.trim()).filter(Boolean);
}
async function main() {
    const patterns = parsePatterns(node_process_1.default.argv.slice(2));
    const findings = await (0, linter_js_1.lintMigrations)({ patterns });
    if (!findings.length) {
        console.log('✅ Migration linter: no destructive changes detected');
        return;
    }
    console.error('❌ Migration linter detected unsafe changes:\n');
    findings.forEach((finding) => {
        console.error(`• ${finding.file}`);
        console.error(`  Rule: ${finding.rule} – ${finding.message}`);
        console.error(`  Remediation: ${finding.remediation}`);
        console.error('');
    });
    console.error(`To override, include an approval annotation. ${(0, linter_js_1.describeOverrides)()}`);
    node_process_1.default.exit(1);
}
main().catch((err) => {
    console.error('Migration linter failed:', err);
    node_process_1.default.exit(1);
});
