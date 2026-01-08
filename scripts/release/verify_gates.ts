import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { existsSync } from 'node:fs';

const SCRIPTS_DIR = join(process.cwd(), 'scripts', 'release');

function runCheck(name: string, command: string) {
  console.log(`\n🔍 Running ${name}...`);
  try {
    execSync(command, { stdio: 'inherit' });
    console.log(`✅ ${name} passed.`);
  } catch (error) {
    console.error(`❌ ${name} failed.`);
    process.exit(1);
  }
}

console.log('🚦 Verifying GA Release Gates...');

// 1. Policy Verification
if (existsSync(join(SCRIPTS_DIR, 'validate-release-policy.mjs'))) {
  runCheck('Policy Verification', `node ${join(SCRIPTS_DIR, 'validate-release-policy.mjs')}`);
} else {
  console.warn('⚠️ validate-release-policy.mjs not found, skipping policy check (or fail if strict).');
}

// 2. Promotion Guard
if (existsSync(join(SCRIPTS_DIR, 'check-tag-safety.mjs'))) {
    runCheck('Promotion Guard', `node ${join(SCRIPTS_DIR, 'check-tag-safety.mjs')}`);
} else {
    console.warn('⚠️ check-tag-safety.mjs not found, skipping promotion guard.');
}

// 3. Dependency Approval
if (existsSync(join(SCRIPTS_DIR, 'dependency_audit.sh'))) {
    runCheck('Dependency Approval', `bash ${join(SCRIPTS_DIR, 'dependency_audit.sh')}`);
} else {
    console.warn('⚠️ dependency_audit.sh not found, skipping dependency approval.');
}

console.log('\n🎉 Gate verification checks initiated.');
