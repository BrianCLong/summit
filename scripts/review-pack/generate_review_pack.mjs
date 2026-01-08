#!/usr/bin/env node

import { execSync } from 'child_process';
import { createWriteStream, mkdirSync, writeFileSync, cpSync } from 'fs';
import { resolve, dirname } from 'path';
import crypto from 'crypto';
import { globSync } from 'glob';

// --- Configuration ---
const LOG_FILE = '/tmp/assessor-dryrun.log';
const ARTIFACTS_DIR = 'artifacts/review-pack';

// --- Helper Functions ---

/**
 * Executes a command, logs its output, and pipes stdout/stderr to a log file.
 * @param {string} command - The command to execute.
 * @param {WriteStream} logStream - The stream to write logs to.
 */
function runStep(command, logStream) {
  console.log(`\n[RUNNING] ${command}`);
  logStream.write(`\n--- [RUNNING] ${command} ---\n`);
  try {
    const output = execSync(command, { stdio: 'pipe', encoding: 'utf-8' });
    logStream.write(output);
    console.log(`[SUCCESS] ${command}`);
    return true;
  } catch (error) {
    logStream.write(error.stdout || 'No stdout on error.');
    logStream.write(error.stderr || 'No stderr on error.');
    console.error(`[FAILED] ${command}`);
    return false;
  }
}

/**
 * Calculates the SHA256 hash of a file.
 * @param {string} filePath - The path to the file.
 * @returns {string} The SHA256 hash.
 */
function getFileHash(filePath) {
  const fileBuffer = readFileSync(filePath);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex');
}

/**
 * Finds and copies artifacts to the output directory.
 * @param {string} outputDir - The directory to copy artifacts to.
 */
function collectArtifacts(outputDir) {
  console.log('\nCollecting build and test artifacts...');
  const patterns = [
    '**/dist/**',
    '**/build/**',
    '**/reports/**',
    '**/coverage/**',
    '**/playwright-report/**',
  ];
  const ignorePatterns = ['**/node_modules/**'];

  const files = globSync(patterns, { nodir: true, ignore: ignorePatterns });

  files.forEach((file) => {
    const dest = resolve(outputDir, file);
    try {
      mkdirSync(dirname(dest), { recursive: true });
      cpSync(file, dest, { recursive: true });
    } catch (error) {
      console.warn(`Could not copy artifact ${file}: ${error.message}`);
    }
  });

  console.log(`Collected ${files.length} artifact files.`);
}

// --- Main Execution ---

async function main() {
  console.log('--- Starting Assessor Dry-Run ---');
  const logStream = createWriteStream(LOG_FILE);

  // 1. Create the artifact directory
  const shortSha = execSync('git rev-parse --short HEAD').toString().trim();
  const date = new Date().toISOString().split('T')[0];
  const outputDir = resolve(process.cwd(), `${ARTIFACTS_DIR}/${date}/${shortSha}`);
  mkdirSync(outputDir, { recursive: true });
  console.log(`Created artifact directory: ${outputDir}`);

  // 2. Run the walkthrough steps
  const steps = [
    './scripts/validate-env.sh',
    'pnpm install',
    'pnpm run lint',
    'pnpm test',
    'pnpm run build',
  ];

  for (const step of steps) {
    const success = runStep(step, logStream);
    if (!success) {
      console.error(`\nStep "${step}" failed. Aborting.`);
      logStream.end();
      process.exit(1);
    }
  }

  // 3. Collect artifacts
  collectArtifacts(outputDir);

  // 4. Generate the manifest
  console.log('\nGenerating review pack manifest...');
  const manifest = {
    createdAt: new Date().toISOString(),
    commitSha: execSync('git rev-parse HEAD').toString().trim(),
    shortSha,
    artifacts: {},
  };

  const artifactFiles = globSync(`${outputDir}/**/*`, { nodir: true });
  artifactFiles.forEach((file) => {
    const relativePath = file.replace(`${outputDir}/`, '');
    manifest.artifacts[relativePath] = {
      sha256: getFileHash(file),
    };
  });

  writeFileSync(resolve(outputDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log('Manifest generated successfully.');

  // 5. Finalize
  logStream.end();
  console.log(`\n--- Assessor Dry-Run Complete ---`);
  console.log(`Log file available at: ${LOG_FILE}`);
  console.log(`Review pack available at: ${outputDir}`);
}

main().catch((err) => {
  console.error('\nAn unexpected error occurred:', err);
  process.exit(1);
});
