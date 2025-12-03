#!/usr/bin/env npx ts-node --esm
/**
 * Security Scan Script
 *
 * Scans the codebase for security issues.
 */

import { SecurityScanValidator } from '../src/evaluator/validators/SecurityScanValidator.js';
import { glob } from 'glob';
import fs from 'node:fs';
import path from 'node:path';

async function main() {
  console.log('🔒 PVE Security Scan');
  console.log('====================');
  console.log('');

  const validator = new SecurityScanValidator();

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
    const files = await glob(pattern, {
      ignore: ignorePatterns,
      cwd: process.cwd(),
      absolute: true,
    });

    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        const relativePath = path.relative(process.cwd(), file);

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
      } catch (error) {
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
  } else {
    console.log('');
    console.log('✅ No security issues found!');
    process.exit(0);
  }
}

main();
