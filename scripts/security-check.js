#!/usr/bin/env node

import { execSync } from 'child_process';

try {
  console.log('Running security check...');

  console.log('1. Checking dependency vulnerabilities (pnpm audit)...');
  execSync('pnpm audit --audit-level=high', { stdio: 'inherit' });

  console.log('2. Checking pipeline token scopes...');
  execSync('chmod +x scripts/validate-token-scopes.sh && ./scripts/validate-token-scopes.sh', { stdio: 'inherit' });

  console.log('Security check passed.');
} catch (error) {
  console.error('Security check failed!');
  process.exit(1);
}
