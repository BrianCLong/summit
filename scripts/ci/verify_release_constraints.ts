import fs from 'fs';
import yaml from 'js-yaml';
import path from 'path';

const constraintsPath = path.join(process.cwd(), 'governance/constraints.yaml');

if (!fs.existsSync(constraintsPath)) {
  console.error('❌ RELEASE ABORTED: governance/constraints.yaml is missing. Cannot verify release constraints.');
  process.exit(1);
}

try {
  const constraints = yaml.load(fs.readFileSync(constraintsPath, 'utf8')) as any;

  if (constraints.release?.blackout_window) {
    console.error('❌ RELEASE ABORTED: Blackout window is active.');
    process.exit(1);
  }

  console.log('✅ Release Constraints Verified: No active blackout window.');
  process.exit(0);
} catch (error) {
  console.error('Error reading constraints:', error);
  process.exit(1);
}
