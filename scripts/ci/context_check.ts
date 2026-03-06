import { buildManifest } from '../../packages/context/src/builder.mjs';
import { scanFiles } from '../../packages/context/src/policy.mjs';

console.log('Running Context Policy Check...');

const manifest = buildManifest();
const files = Object.values(manifest.files);
const violations = scanFiles(files);

if (violations.length > 0) {
  console.error('❌ Policy Violations Found:');
  violations.forEach(v => {
    console.error(`  [${v.severity.toUpperCase()}] ${v.path}: ${v.rule}`);
  });

  if (violations.some(v => v.severity === 'error')) {
    process.exit(1);
  }
} else {
  console.log('✅ No policy violations found.');
}
