#!/usr/bin/env node

/**
 * Traceability Check Script
 *
 * Scans the codebase for @trace tags in comments and JSDocs.
 * Reports on coverage and missing traces in critical files.
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const readFile = promisify(fs.readFile);

// Configuration
const CONFIG = {
  include: [
    'server/src',
    'intelgraph-mvp/api',
    'apps/web/src'
  ],
  exclude: [
    'node_modules',
    'dist',
    'build',
    'coverage',
    '__tests__',
    'tests'
  ],
  extensions: ['.ts', '.js', '.tsx', '.jsx']
};

// Regex for finding @trace tags
// Matches: @trace REQ-123 or @trace FEAT-ABC
const TRACE_REGEX = /@trace\s+([A-Z0-9-]+(?:-[A-Z0-9-]+)*)/g;

async function scanDirectory(dir) {
  let results = {
    filesScanned: 0,
    traceTags: 0,
    tags: {},
    filesWithTrace: []
  };

  try {
    const files = await readdir(dir);

    for (const file of files) {
      const filePath = path.join(dir, file);
      const stats = await stat(filePath);

      if (stats.isDirectory()) {
        if (!CONFIG.exclude.includes(file)) {
          const subResults = await scanDirectory(filePath);
          results.filesScanned += subResults.filesScanned;
          results.traceTags += subResults.traceTags;
          results.filesWithTrace = results.filesWithTrace.concat(subResults.filesWithTrace);

          // Merge tags
          for (const [tag, count] of Object.entries(subResults.tags)) {
            results.tags[tag] = (results.tags[tag] || 0) + count;
          }
        }
      } else if (CONFIG.extensions.includes(path.extname(file))) {
        results.filesScanned++;
        const content = await readFile(filePath, 'utf8');
        let match;
        let fileHasTrace = false;

        while ((match = TRACE_REGEX.exec(content)) !== null) {
          const tag = match[1];
          results.traceTags++;
          results.tags[tag] = (results.tags[tag] || 0) + 1;
          fileHasTrace = true;
        }

        if (fileHasTrace) {
          results.filesWithTrace.push(filePath);
        }
      }
    }
  } catch (err) {
    // Ignore errors for non-existent directories if strictly configured,
    // but warn if it's a root config path.
    if (err.code !== 'ENOENT') {
      console.error(`Error scanning ${dir}:`, err);
    }
  }

  return results;
}

async function main() {
  console.log('🔍 Starting Traceability Scan...\n');

  let totalResults = {
    filesScanned: 0,
    traceTags: 0,
    tags: {},
    filesWithTrace: []
  };

  for (const dir of CONFIG.include) {
    if (fs.existsSync(dir)) {
      console.log(`Scanning ${dir}...`);
      const results = await scanDirectory(dir);

      totalResults.filesScanned += results.filesScanned;
      totalResults.traceTags += results.traceTags;
      totalResults.filesWithTrace = totalResults.filesWithTrace.concat(results.filesWithTrace);

      // Merge tags
      for (const [tag, count] of Object.entries(results.tags)) {
        totalResults.tags[tag] = (totalResults.tags[tag] || 0) + count;
      }
    } else {
      console.warn(`⚠️  Directory not found: ${dir}`);
    }
  }

  console.log('\n📊 Scan Results:');
  console.log('------------------');
  console.log(`Files Scanned:      ${totalResults.filesScanned}`);
  console.log(`Trace Tags Found:   ${totalResults.traceTags}`);
  console.log(`Files with Traces:  ${totalResults.filesWithTrace.length}`);

  console.log('\n🏷️  Tag Summary (Top 10):');
  const sortedTags = Object.entries(totalResults.tags)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10);

  if (sortedTags.length > 0) {
    sortedTags.forEach(([tag, count]) => {
      console.log(`  - ${tag}: ${count}`);
    });
  } else {
    console.log('  No tags found.');
  }

  // Optional: Check for specific requirements if passed as args
  const args = process.argv.slice(2);
  if (args.length > 0) {
    console.log('\n🔎 Verifying Specific Tags:');
    let missing = false;
    args.forEach(arg => {
      if (totalResults.tags[arg]) {
        console.log(`  ✅ ${arg} found (${totalResults.tags[arg]} times)`);
      } else {
        console.log(`  ❌ ${arg} NOT found`);
        missing = true;
      }
    });

    if (missing) {
      process.exit(1);
    }
  }
}

main().catch(console.error);
