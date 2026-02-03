import { execSync } from 'node:child_process';
try {
  console.log("Running Azure Turin v7 Drift Check...");
  execSync('node scripts/ci/verify_subsumption_bundle.mjs subsumption/azure-turin-v7/manifest.yaml', { stdio: 'inherit' });
  console.log("No drift detected.");
} catch (e) {
  console.error("Drift detected! Verifier failed.");
  process.exit(1);
}
