import fs from 'fs';
import path from 'path';

const REQUIRED_FILES = [
  'THIRD_PARTY_NOTICES.md',
  'SECURITY.md',
  'GA_RELEASE_CHECKLIST.md',
  'docs/legal/TERMS.md',
  'docs/legal/PRIVACY.md',
  'docs/legal/DPA.md',
  'docs/legal/SUBPROCESSORS.md',
  'docs/security/THREAT_MODEL.md',
];

const ROOT_DIR = process.cwd();

console.log('🔍 Checking GA Readiness...');

let failed = false;

// 1. Check file existence
console.log('📂 Verifying required files...');
for (const file of REQUIRED_FILES) {
  const filePath = path.join(ROOT_DIR, file);
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Missing file: ${file}`);
    failed = true;
  } else {
    // Check if empty
    const stat = fs.statSync(filePath);
    if (stat.size < 10) {
        console.error(`⚠️ File exists but seems empty: ${file}`);
        failed = true;
    } else {
        console.log(`✅ Found: ${file}`);
    }
  }
}

// 2. Check THIRD_PARTY_NOTICES content
if (fs.existsSync(path.join(ROOT_DIR, 'THIRD_PARTY_NOTICES.md'))) {
    const notices = fs.readFileSync(path.join(ROOT_DIR, 'THIRD_PARTY_NOTICES.md'), 'utf8');
    if (!notices.includes('JavaScript') && !notices.includes('Python')) {
        console.warn('⚠️ THIRD_PARTY_NOTICES.md might be incomplete (missing section headers).');
    }
}

if (failed) {
  console.error('\n❌ GA Readiness Check FAILED. Please resolve missing items.');
  process.exit(1);
} else {
  console.log('\n✅ GA Readiness Check PASSED.');
  process.exit(0);
}
