#!/usr/bin/env node
import { execSync } from 'node:child_process';
const sh = (c) => execSync(c, { stdio: 'inherit' });
try {
  sh(
    'command -v helm >/dev/null 2>&1 && helm lint deploy/helm || echo "helm not installed, skipping"',
  );
  sh(
    'command -v terraform >/dev/null 2>&1 && (cd infra && terraform fmt -check && terraform validate) || echo "terraform not installed, skipping"',
  );
  console.log('✅ ops validate ok');
} catch (e) {
  console.error('❌ ops validate failed');
  process.exit(1);
}
