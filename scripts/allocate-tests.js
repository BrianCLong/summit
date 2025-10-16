#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Dynamic test allocation for balanced sharding
 * Usage: node allocate-tests.js <shardIndex> <totalShards> [timingFile]
 */

function main() {
  const shardIndex = parseInt(process.argv[2], 10);
  const totalShards = parseInt(process.argv[3], 10);
  const timingFile = process.argv[4] || 'ci/test-timings.json';

  if (
    !shardIndex ||
    !totalShards ||
    shardIndex < 1 ||
    shardIndex > totalShards
  ) {
    console.error(
      'Usage: node allocate-tests.js <shardIndex> <totalShards> [timingFile]',
    );
    console.error('Example: node allocate-tests.js 1 4 ci/test-timings.json');
    process.exit(1);
  }

  let timings = {};

  try {
    if (fs.existsSync(timingFile)) {
      const data = JSON.parse(fs.readFileSync(timingFile, 'utf8'));
      // Filter out metadata
      timings = Object.fromEntries(
        Object.entries(data).filter(([key]) => !key.startsWith('_')),
      );
    } else {
      console.error(
        `⚠️ Warning: Timing file ${timingFile} not found, using equal distribution`,
      );
    }
  } catch (error) {
    console.error(`⚠️ Warning: Failed to read timing file: ${error.message}`);
  }

  // Get all test files if no timing data
  if (Object.keys(timings).length === 0) {
    console.error(
      '📊 No timing data available, falling back to file-based distribution',
    );
    timings = getDefaultTestFiles();
  }

  // Sort tests by duration (longest first for better balancing)
  const sortedTests = Object.entries(timings).sort(
    (a, b) => (b[1] || 1) - (a[1] || 1),
  );

  // Create buckets for each shard
  const buckets = Array.from({ length: totalShards }, (_, i) => ({
    index: i + 1,
    totalTime: 0,
    files: [],
  }));

  // Greedy algorithm: assign each test to the shard with least total time
  for (const [testFile, duration] of sortedTests) {
    // Sort buckets by total time (ascending)
    buckets.sort((a, b) => a.totalTime - b.totalTime);

    // Add to the bucket with least time
    const targetBucket = buckets[0];
    targetBucket.files.push(testFile);
    targetBucket.totalTime += duration || 1; // Default to 1 second if no timing
  }

  // Get the files for the requested shard
  const myBucket = buckets.find((b) => b.index === shardIndex);

  if (!myBucket) {
    console.error(`❌ Error: Shard ${shardIndex} not found`);
    process.exit(1);
  }

  // Output the files for this shard
  const output = myBucket.files.join(' ');
  console.log(output);

  // Log distribution info to stderr (won't affect the output used by CI)
  if (process.env.VERBOSE === '1') {
    console.error('\n📈 Shard Distribution:');
    buckets.forEach((bucket) => {
      console.error(
        `  Shard ${bucket.index}: ${bucket.files.length} files, ~${Math.round(bucket.totalTime)}s`,
      );
    });

    console.error(`\n🎯 Selected Shard ${shardIndex}:`);
    console.error(`  Files: ${myBucket.files.length}`);
    console.error(`  Estimated time: ~${Math.round(myBucket.totalTime)}s`);

    // Calculate balance metrics
    const times = buckets.map((b) => b.totalTime);
    const maxTime = Math.max(...times);
    const minTime = Math.min(...times);
    const skew =
      maxTime > 0 ? (((maxTime - minTime) / maxTime) * 100).toFixed(1) : 0;
    console.error(`  Skew: ${skew}% (lower is better)`);
  }
}

function getDefaultTestFiles() {
  const testFiles = {};
  const patterns = [
    /\.test\.(js|ts|jsx|tsx)$/,
    /\.spec\.(js|ts|jsx|tsx)$/,
    /^test_.*\.py$/,
    /__tests__\/.*\.(js|ts|jsx|tsx)$/,
  ];

  function scanDirectory(dir, basePath = '') {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.join(basePath, entry.name);

        if (
          entry.isDirectory() &&
          !entry.name.startsWith('.') &&
          entry.name !== 'node_modules' &&
          entry.name !== 'dist' &&
          entry.name !== 'coverage'
        ) {
          scanDirectory(fullPath, relativePath);
        } else if (entry.isFile() && patterns.some((p) => p.test(entry.name))) {
          // Estimate based on file size
          try {
            const stats = fs.statSync(fullPath);
            const estimatedTime = Math.max(1, Math.min(30, stats.size / 5000)); // 5KB ~ 1 second
            testFiles[relativePath] = estimatedTime;
          } catch {
            testFiles[relativePath] = 5; // Default 5 seconds
          }
        }
      }
    } catch (error) {
      console.error(`Warning: Cannot read directory ${dir}: ${error.message}`);
    }
  }

  scanDirectory('.');
  return testFiles;
}

if (require.main === module) {
  main();
}

module.exports = { main };
