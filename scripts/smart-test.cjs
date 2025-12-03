#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const RESULTS_FILE = '.jest-results.json';

// Helper to execute commands
const exec = (cmd) => {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: 'pipe' }).trim();
  } catch (e) {
    return '';
  }
};

function getGitDiffBase() {
  try {
     execSync('git rev-parse origin/main', { stdio: 'ignore' });
     return 'origin/main';
  } catch {
     try {
       execSync('git rev-parse main', { stdio: 'ignore' });
       return 'main';
     } catch {
       return 'HEAD';
     }
  }
}

// 1. Get Changed Files
function getChangedFiles() {
  console.log('🔍 Analyzing Git changes...');
  const base = getGitDiffBase();

  let changed = new Set();

  const workingDiff = exec('git diff --name-only HEAD');
  if (workingDiff) workingDiff.split('\n').forEach(f => changed.add(f));

  if (base !== 'HEAD') {
      const committedDiff = exec(`git diff --name-only ${base}...HEAD`);
      if (committedDiff) committedDiff.split('\n').forEach(f => changed.add(f));
  }

  return Array.from(changed).filter(f => f && (f.endsWith('.ts') || f.endsWith('.js') || f.endsWith('.tsx') || f.endsWith('.jsx')));
}

// 2. Get Previously Failing Tests
function getFailingTests() {
  console.log('📜 Checking previous test failures...');
  if (!fs.existsSync(RESULTS_FILE)) return [];
  try {
    const data = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf8'));
    if (!data.testResults) return [];
    return data.testResults
      .filter((t) => t.status === 'failed')
      .map((t) => t.name);
  } catch (e) {
    return [];
  }
}

// 3. Get Risk Hotspots (Pure JS implementation)
function getRiskHotspots() {
  console.log('🔥 Identifying risk hotspots (high churn files)...');
  try {
    // Get list of changed files from logs
    // --format= --name-only ensures we only get filenames
    const output = exec('git log --name-only --format= --since="30 days ago"');

    if (!output) return [];

    const fileCounts = {};
    output.split('\n').forEach(line => {
      const file = line.trim();
      if (file) {
        fileCounts[file] = (fileCounts[file] || 0) + 1;
      }
    });

    // Sort by count descending
    const sorted = Object.entries(fileCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([file]) => file)
      .slice(0, 20); // Top 20

    return sorted.filter(f => fs.existsSync(f));
  } catch (e) {
    console.warn('Failed to calculate risk hotspots', e);
    return [];
  }
}

function run() {
  const changedFiles = getChangedFiles();
  const failingTests = getFailingTests();
  const hotspots = getRiskHotspots();

  console.log(`\n📋 Intelligent Test Plan:`);
  console.log(`   - ${changedFiles.length} changed files`);
  console.log(`   - ${failingTests.length} previously failing tests`);
  console.log(`   - ${hotspots.length} risk hotspots detected`);

  const resultsArg = `--json --outputFile=${RESULTS_FILE}`;

  // Locate jest binary
  let jestBin = 'npx jest';
  const localJest = path.join(process.cwd(), 'node_modules', '.bin', 'jest');
  if (fs.existsSync(localJest)) {
      jestBin = localJest;
  }

  let hasRun = false;

  // We want to construct a SINGLE run command if possible to consolidate results,
  // but "failing tests" are explicit paths, and "changed files" need --findRelatedTests.
  // Jest does not support mixing explicit paths and --findRelatedTests easily in a way that implies "Run A AND related(B)".

  // Step 1: Resolve related tests for changed files without running them.
  let relatedTests = [];
  if (changedFiles.length > 0) {
      console.log('🔍 Resolving related tests...');
      try {
          // --listTests returns JSON list of tests that WOULD run
          const listOutput = exec(`${jestBin} --findRelatedTests ${changedFiles.join(' ')} --listTests --json`);
          if (listOutput) {
             const listData = JSON.parse(listOutput);
             relatedTests = listData || [];
          }
      } catch (e) {
          console.warn('Failed to resolve related tests via Jest. Fallback to running directly.');
      }
  }

  // Step 2: Combine Failing Tests + Related Tests
  const allTestsToRun = new Set([
      ...failingTests,
      ...relatedTests
  ]);

  if (allTestsToRun.size > 0) {
      console.log(`\n🚀 Running ${allTestsToRun.size} prioritized tests...`);

      const tests = Array.from(allTestsToRun);

      // Check for hotspots
      const touchedHotspots = hotspots.filter(h => changedFiles.includes(h));
      if (touchedHotspots.length > 0) {
          console.log(`   ⚠️  Hotspots touched:`);
          touchedHotspots.forEach(h => console.log(`      - ${h}`));
      }

      try {
          // Pass the list of test files explicitly
          // We must be careful about command line length limits, but typically fine.
          execSync(`${jestBin} ${tests.join(' ')} ${resultsArg} --passWithNoTests`, { stdio: 'inherit' });
          hasRun = true;
      } catch (e) {
          console.log('❌ Tests failed.');
          process.exit(1);
      }
  }

  if (!hasRun) {
    if (changedFiles.length > 0) {
       // Fallback: If we failed to resolve list, run via findRelatedTests
       console.log(`\n🔍 [Fallback] Running tests related to ${changedFiles.length} changed files...`);
       try {
         execSync(`${jestBin} --findRelatedTests ${changedFiles.join(' ')} ${resultsArg} --passWithNoTests`, { stdio: 'inherit' });
       } catch (e) {
         process.exit(1);
       }
    } else {
       console.log('\n✅ No relevant changes or failures detected.');
       console.log('   (Skipping execution. Use `npm test` for full suite)');
    }
  }
}

run();
