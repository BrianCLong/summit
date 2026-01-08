
import fs from 'node:fs/promises';
import { collectBundleFiles, POLICY_DIR, LOCK_FILE } from './policy_bundle_utils';

async function checkDrift() {
  try {
    // Calculate content hash from source files (not dist)
    const { contentHash } = await collectBundleFiles(POLICY_DIR);

    let expectedHash = '';
    try {
        expectedHash = (await fs.readFile(LOCK_FILE, 'utf8')).trim();
    } catch (e) {
        console.log('No lockfile found. Treating as new bundle.');
    }

    if (expectedHash && contentHash !== expectedHash) {
        console.error(`DRIFT DETECTED! Policy content hash ${contentHash} does not match lockfile ${expectedHash}.`);
        console.error('Please run `npx tsx scripts/ci/build_policy_bundle.ts` and commit the updated lockfile.');
        process.exit(1);
    } else if (!expectedHash) {
        console.log(`No lockfile. Current content hash: ${contentHash}`);
    } else {
        console.log('Policy bundle is in sync.');
    }

  } catch (err) {
    console.error('Drift check failed:', err);
    process.exit(1);
  }
}

checkDrift();
