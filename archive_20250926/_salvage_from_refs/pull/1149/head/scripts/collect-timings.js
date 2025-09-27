#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Collect test timing data for dynamic sharding
 * Reads Jest/Pytest reports and generates timing file
 */

function collectJestTimings() {
  const timings = {};
  
  try {
    // Look for Jest test results
    const jestResults = fs.readdirSync('.')
      .filter(f => f.includes('junit') || f.includes('test-results'))
      .map(f => path.resolve(f));

    for (const resultFile of jestResults) {
      if (fs.existsSync(resultFile) && resultFile.endsWith('.xml')) {
        try {
          const content = fs.readFileSync(resultFile, 'utf8');
          
          // Parse XML to extract test timings (simplified)
          const testCaseRegex = /<testcase[^>]+name="([^"]+)"[^>]+time="([^"]+)"/g;
          let match;
          
          while ((match = testCaseRegex.exec(content)) !== null) {
            const [, testName, time] = match;
            timings[testName] = parseFloat(time);
          }
        } catch (error) {
          console.warn(`Failed to parse ${resultFile}:`, error.message);
        }
      }
    }

    // Also check for coverage reports with timing info
    if (fs.existsSync('coverage/lcov-report/index.html')) {
      // Extract timing from coverage reports if available
      console.log('Found coverage report, extracting additional timing data');
    }

  } catch (error) {
    console.warn('Failed to collect Jest timings:', error.message);
  }

  return timings;
}

function collectPytestTimings() {
  const timings = {};
  
  try {
    // Look for pytest results
    const pytestFiles = fs.readdirSync('.')
      .filter(f => f.startsWith('pytest') && f.endsWith('.xml'));

    for (const file of pytestFiles) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        
        // Parse pytest XML format
        const testCaseRegex = /<testcase[^>]+name="([^"]+)"[^>]*time="([^"]+)"/g;
        let match;
        
        while ((match = testCaseRegex.exec(content)) !== null) {
          const [, testName, time] = match;
          timings[testName] = parseFloat(time);
        }
      } catch (error) {
        console.warn(`Failed to parse ${file}:`, error.message);
      }
    }
  } catch (error) {
    console.warn('Failed to collect Pytest timings:', error.message);
  }

  return timings;
}

function collectHistoricalTimings() {
  const timings = {};
  
  try {
    // Try to get historical data from previous runs
    if (fs.existsSync('ci/test-timings.json')) {
      const historical = JSON.parse(fs.readFileSync('ci/test-timings.json', 'utf8'));
      
      // Merge with decay factor for historical data
      const decayFactor = 0.7; // Give more weight to recent runs
      
      for (const [test, time] of Object.entries(historical)) {
        timings[test] = (timings[test] || 0) + time * decayFactor;
      }
    }
  } catch (error) {
    console.warn('Failed to load historical timings:', error.message);
  }

  return timings;
}

function estimateUnknownTests() {
  const timings = {};
  
  try {
    // Estimate timing for tests without historical data
    const testFiles = [];
    
    // Find test files
    function findTestFiles(dir) {
      const files = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const file of files) {
        if (file.isDirectory() && !file.name.startsWith('.') && file.name !== 'node_modules') {
          findTestFiles(path.join(dir, file.name));
        } else if (file.isFile() && 
                  (file.name.includes('.test.') || 
                   file.name.includes('.spec.') || 
                   file.name.startsWith('test_'))) {
          testFiles.push(path.join(dir, file.name));
        }
      }
    }

    findTestFiles('.');

    // Estimate timing based on file size and complexity
    for (const testFile of testFiles) {
      try {
        const stats = fs.statSync(testFile);
        const content = fs.readFileSync(testFile, 'utf8');
        
        // Simple heuristic: file size + test count
        const testCount = (content.match(/\b(test|it|describe)\s*\(/g) || []).length;
        const estimatedTime = Math.min(30, Math.max(1, stats.size / 1000 + testCount * 0.5));
        
        const testKey = testFile.replace(/^\.\//, '');
        if (!timings[testKey]) {
          timings[testKey] = estimatedTime;
        }
      } catch (error) {
        console.warn(`Failed to estimate timing for ${testFile}:`, error.message);
      }
    }
  } catch (error) {
    console.warn('Failed to estimate unknown test timings:', error.message);
  }

  return timings;
}

function main() {
  console.log('Collecting test timing data...');

  let allTimings = {};

  // Collect from various sources
  const jestTimings = collectJestTimings();
  const pytestTimings = collectPytestTimings();
  const historicalTimings = collectHistoricalTimings();
  const estimatedTimings = estimateUnknownTests();

  // Merge all timing sources
  allTimings = {
    ...estimatedTimings,
    ...historicalTimings,
    ...jestTimings,
    ...pytestTimings
  };

  // Filter out invalid timings
  const validTimings = {};
  for (const [test, time] of Object.entries(allTimings)) {
    if (typeof time === 'number' && time > 0 && time < 3600) { // Max 1 hour per test
      validTimings[test] = Math.round(time * 100) / 100; // Round to 2 decimals
    }
  }

  // Add metadata
  const output = {
    ...validTimings,
    _metadata: {
      collected_at: new Date().toISOString(),
      total_tests: Object.keys(validTimings).length,
      total_time: Object.values(validTimings).reduce((a, b) => a + b, 0),
      avg_time: Object.values(validTimings).reduce((a, b) => a + b, 0) / Object.keys(validTimings).length || 0
    }
  };

  // Output to stdout (for CI) and file
  console.log(JSON.stringify(output, null, 2));

  // Also save to file if we can
  try {
    if (!fs.existsSync('ci')) {
      fs.mkdirSync('ci', { recursive: true });
    }
    fs.writeFileSync('ci/test-timings.json', JSON.stringify(output, null, 2));
    
    console.error(`✅ Collected ${Object.keys(validTimings).length} test timings`);
    console.error(`📊 Total estimated time: ${Math.round(output._metadata.total_time)}s`);
    console.error(`⏱️  Average per test: ${Math.round(output._metadata.avg_time * 100) / 100}s`);
  } catch (error) {
    console.error('Failed to write timing file:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { collectJestTimings, collectPytestTimings };