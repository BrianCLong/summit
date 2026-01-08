#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

const ARGS = process.argv.slice(2);
const FLAGS = {};
for (let i = 0; i < ARGS.length; i++) {
  if (ARGS[i].startsWith('--')) {
    const key = ARGS[i].substring(2);
    const value = ARGS[i + 1];
    FLAGS[key] = value;
    i++;
  }
}

const COMMAND = FLAGS.cmd || 'unknown-command';
const LOG_FILE = FLAGS['log-file'];
const JUNIT_XML = FLAGS['junit-xml'];
const OUTPUT_DIR = FLAGS['output-dir'] || 'artifacts/triage';

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function main() {
  console.log('Running capture_failures.mjs...');

  let classification = 'unknown';
  let logContent = '';
  let failingTests = [];

  // Read log file if provided
  if (LOG_FILE && fs.existsSync(LOG_FILE)) {
    try {
      logContent = fs.readFileSync(LOG_FILE, 'utf8');
    } catch (e) {
      console.warn(`Failed to read log file: ${LOG_FILE}`, e);
    }
  }

  // Simple heuristics
  if (logContent.includes('ENAMETOOLONG') || logContent.includes('File name too long')) {
    classification = 'path-length';
  } else if (logContent.includes('EADDRINUSE') || logContent.includes('address already in use')) {
    classification = 'network-listen constraint';
  } else if (logContent.includes('ETIMEDOUT') || logContent.includes('Timeout') || logContent.includes('timed out')) {
    classification = 'timeout';
  } else if (logContent.includes('Jest failed') || logContent.includes('Tests failed')) {
    classification = 'test failure';
  }

  // Parse JUnit XML if provided (basic parsing)
  if (JUNIT_XML && fs.existsSync(JUNIT_XML)) {
    try {
      const xmlContent = fs.readFileSync(JUNIT_XML, 'utf8');
      // Very basic regex parsing to avoid dependencies
      const failureMatches = xmlContent.match(/<testcase[^>]*>[\s\S]*?<failure[^>]*>([\s\S]*?)<\/failure>[\s\S]*?<\/testcase>/g);
      if (failureMatches) {
          classification = 'test failure';
          failingTests = failureMatches.map(match => {
             const nameMatch = match.match(/name="([^"]*)"/);
             const classnameMatch = match.match(/classname="([^"]*)"/);
             const name = nameMatch ? nameMatch[1] : 'unknown';
             const classname = classnameMatch ? classnameMatch[1] : 'unknown';
             return `${classname} - ${name}`;
          });
      }
    } catch (e) {
        console.warn(`Failed to parse JUnit XML: ${JUNIT_XML}`, e);
    }
  }

  // Fallback to log scraping for failing tests if JUnit not provided
  if (failingTests.length === 0 && logContent) {
     // Look for standard test runner outputs
     // Example: "FAIL src/foo/bar.test.ts"
     const failMatches = logContent.match(/^FAIL\s+(.*)$/gm);
     if (failMatches) {
        classification = 'test failure';
        failingTests = failMatches.map(m => m.replace(/^FAIL\s+/, '').trim());
     }
  }

  // Generate artifacts
  let rerunCommand = COMMAND;
  if (!COMMAND.startsWith('pnpm') && !COMMAND.startsWith('npm') && !COMMAND.startsWith('make')) {
      rerunCommand = `pnpm ${COMMAND}`;
  }

  const summary = {
    command: COMMAND,
    classification,
    failingTestCount: failingTests.length,
    failingTests: failingTests.slice(0, 10), // Top 10
    rerunCommand,
    timestamp: new Date().toISOString(),
  };

  // 1. JSON Report
  fs.writeFileSync(path.join(OUTPUT_DIR, 'triage.json'), JSON.stringify(summary, null, 2));

  // 2. Failing Tests List
  if (failingTests.length > 0) {
    fs.writeFileSync(path.join(OUTPUT_DIR, 'failing_tests.txt'), failingTests.join('\n'));
  }

  // 3. Markdown Report
  const mdReport = `
# CI Triage Report

**Classification:** ${classification}
**Command:** \`${COMMAND}\`
**Timestamp:** ${summary.timestamp}

## Failing Tests (${failingTests.length})
${failingTests.length > 0 ? failingTests.slice(0, 20).map(t => `- ${t}`).join('\n') : '_No specific test failures detected_'}
${failingTests.length > 20 ? `\n... and ${failingTests.length - 20} more.` : ''}

## Local Reproduction
\`\`\`bash
${summary.rerunCommand}
\`\`\`

## Log Snippet (Last 20 lines)
\`\`\`
${logContent.split('\n').slice(-20).join('\n')}
\`\`\`
`;
  fs.writeFileSync(path.join(OUTPUT_DIR, 'triage.md'), mdReport.trim());

  // Output for GitHub Actions
  if (process.env.GITHUB_STEP_SUMMARY) {
     fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `
### 🚨 CI Failure Analysis
* **Classification:** ${classification}
* **Failures:** ${failingTests.length}
* **Rerun:** \`${summary.rerunCommand}\`

[View Triage Artifacts](${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID})
`);
  }

  console.log(`Triage artifacts generated in ${OUTPUT_DIR}`);
}

main().catch(err => {
  console.error('Fatal error in capture_failures.mjs:', err);
  process.exit(1);
});
