import * as fs from 'fs';
import * as path from 'path';
import { validateManifest, ExperimentManifest } from '../src/types';

const EXPERIMENTS_DIR = path.resolve(__dirname, '../experiments');

if (!fs.existsSync(EXPERIMENTS_DIR)) {
  console.log('No experiments directory found.');
  process.exit(0);
}

const experiments = fs.readdirSync(EXPERIMENTS_DIR, { withFileTypes: true })
  .filter(dirent => dirent.isDirectory())
  .map(dirent => dirent.name);

console.log(`Found ${experiments.length} experiments.`);

let hasErrors = false;

experiments.forEach(expId => {
  const manifestPath = path.join(EXPERIMENTS_DIR, expId, 'manifest.json');

  if (!fs.existsSync(manifestPath)) {
    console.error(`ERROR: Experiment ${expId} missing manifest.json`);
    hasErrors = true;
    return;
  }

  try {
    const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
    const manifest: ExperimentManifest = JSON.parse(manifestContent);

    // Validate schema
    const validationErrors = validateManifest(manifest);
    if (validationErrors.length > 0) {
      console.error(`ERROR: Invalid manifest for ${expId}:`);
      validationErrors.forEach(err => console.error(`  - ${err}`));
      hasErrors = true;
    }

    // Check expiration
    const startDate = new Date(manifest.startDate);
    const endDate = new Date(startDate.getTime() + manifest.durationDays * 24 * 60 * 60 * 1000);
    const now = new Date();

    if (now > endDate && manifest.status === 'ACTIVE') {
      console.warn(`WARNING: Experiment ${expId} has EXPIRED (End Date: ${endDate.toISOString().split('T')[0]}). Should be COMPLETED, PROMOTED, or REJECTED.`);
    }

  } catch (e) {
    console.error(`ERROR: Failed to parse manifest for ${expId}`, e);
    hasErrors = true;
  }
});

if (hasErrors) {
  process.exit(1);
} else {
  console.log('All experiments valid.');
}
