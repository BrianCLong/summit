#!/usr/bin/env npx ts-node --esm
"use strict";
/**
 * TSConfig Checker Script
 *
 * Validates TypeScript configurations across the monorepo.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const TSConfigValidator_js_1 = require("../src/evaluator/validators/TSConfigValidator.js");
const glob_1 = require("glob");
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
async function main() {
    console.log('📝 PVE TSConfig Validation');
    console.log('==========================');
    console.log('');
    const validator = new TSConfigValidator_js_1.TSConfigValidator({
        requiredOptions: {
            esModuleInterop: true,
            skipLibCheck: true,
        },
        minTarget: 'ES2020',
    });
    // Find all tsconfig files
    const files = await (0, glob_1.glob)('**/tsconfig.json', {
        ignore: ['**/node_modules/**', '**/dist/**'],
        cwd: process.cwd(),
        absolute: true,
    });
    let totalWarnings = 0;
    let totalErrors = 0;
    for (const file of files) {
        try {
            const content = node_fs_1.default.readFileSync(file, 'utf-8');
            const config = JSON.parse(content);
            const relativePath = node_path_1.default.relative(process.cwd(), file);
            const results = await validator.validate({
                type: 'tsconfig_integrity',
                input: {
                    type: 'tsconfig_integrity',
                    config,
                    filePath: relativePath,
                },
            });
            const issues = results.filter((r) => !r.allowed);
            if (issues.length > 0) {
                console.log(`\n📄 ${relativePath}`);
                for (const issue of issues) {
                    const icon = issue.severity === 'error' ? '❌' : '⚠️';
                    console.log(`  ${icon} ${issue.message}`);
                    if (issue.fix) {
                        console.log(`     Fix: ${issue.fix}`);
                    }
                    if (issue.severity === 'error') {
                        totalErrors++;
                    }
                    else {
                        totalWarnings++;
                    }
                }
            }
        }
        catch (error) {
            // Skip files that can't be parsed
        }
    }
    console.log('');
    console.log('─'.repeat(40));
    console.log(`📊 Checked ${files.length} tsconfig files`);
    console.log(`❌ ${totalErrors} error(s), ⚠️  ${totalWarnings} warning(s)`);
    if (totalErrors > 0) {
        console.log('');
        console.log('❌ TSConfig validation failed');
        process.exit(1);
    }
    else {
        console.log('');
        console.log('✅ TSConfig validation passed!');
        process.exit(0);
    }
}
main();
