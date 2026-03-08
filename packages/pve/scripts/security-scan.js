#!/usr/bin/env npx ts-node --esm
"use strict";
/**
 * Security Scan Script
 *
 * Scans the codebase for security issues.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const SecurityScanValidator_js_1 = require("../src/evaluator/validators/SecurityScanValidator.js");
const glob_1 = require("glob");
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
async function main() {
    console.log('🔒 PVE Security Scan');
    console.log('====================');
    console.log('');
    const validator = new SecurityScanValidator_js_1.SecurityScanValidator();
    // Find files to scan
    const patterns = [
        'src/**/*.ts',
        'packages/*/src/**/*.ts',
        'services/*/src/**/*.ts',
        'apps/*/src/**/*.ts',
    ];
    const ignorePatterns = [
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/__tests__/**',
    ];
    let totalIssues = 0;
    let scannedFiles = 0;
    for (const pattern of patterns) {
        const files = await (0, glob_1.glob)(pattern, {
            ignore: ignorePatterns,
            cwd: process.cwd(),
            absolute: true,
        });
        for (const file of files) {
            try {
                const content = node_fs_1.default.readFileSync(file, 'utf-8');
                const relativePath = node_path_1.default.relative(process.cwd(), file);
                const results = await validator.validate({
                    type: 'security_scan',
                    input: {
                        type: 'security_scan',
                        scanType: 'secrets',
                        content,
                        filePaths: [relativePath],
                    },
                });
                const issues = results.filter((r) => !r.allowed);
                if (issues.length > 0) {
                    console.log(`\n📄 ${relativePath}`);
                    for (const issue of issues) {
                        const icon = issue.severity === 'error' ? '❌' : '⚠️';
                        console.log(`  ${icon} [${issue.severity}] ${issue.message}`);
                        if (issue.location?.line) {
                            console.log(`     Line: ${issue.location.line}`);
                        }
                    }
                    totalIssues += issues.length;
                }
                scannedFiles++;
            }
            catch (error) {
                // Skip files that can't be read
            }
        }
    }
    console.log('');
    console.log('─'.repeat(40));
    console.log(`📊 Scanned ${scannedFiles} files`);
    console.log(`🔍 Found ${totalIssues} issue(s)`);
    if (totalIssues > 0) {
        const errors = totalIssues; // Simplification
        console.log('');
        console.log('❌ Security scan found issues');
        process.exit(1);
    }
    else {
        console.log('');
        console.log('✅ No security issues found!');
        process.exit(0);
    }
}
main();
