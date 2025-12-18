
import { SecretDriftDetector } from '../security/secret-drift.js';
import path from 'path';

async function main() {
  const autoFix = process.argv.includes('--fix');

  // Assuming this script is run from server/ root or via tsx from server/
  // The detector uses process.cwd() to find .env, which should be correct if run from server/
  const detector = new SecretDriftDetector();

  try {
    const report = await detector.runAudit(autoFix);

    if (report.leaked.length > 0 || report.expired.length > 0) {
      process.exit(1); // Fail the build/check if critical issues found
    }

    // Unused secrets might be warnings, but we exit 0
    process.exit(0);
  } catch (error) {
    console.error('Error running Secret Drift Detector:', error);
    process.exit(1);
  }
}

main();
