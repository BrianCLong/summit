import { spawnSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// Configuration
const HIGH_RISK_KEYWORDS = [
  'password',
  'secret',
  'api_key',
  'apiKey',
  'apikey',
  'access_token',
  'accessToken',
  'auth_token',
  'authToken',
  'bearer',
  'private_key',
  'privateKey',
  'credential',
  'passwd',
];

const LOGGING_PATTERNS = [
  'console\\.log',
  'console\\.error',
  'console\\.warn',
  'console\\.info',
  'console\\.debug',
  'logger\\.(info|debug|error|warn|fatal)',
];

// Combine into a single regex for "logging pattern followed by something containing a keyword"
// We look for the logging call, then check the line content for keywords.
// This is a heuristic.
const FILE_EXTENSIONS = ['js', 'ts', 'jsx', 'tsx', 'mjs', 'cjs'];

function runCheck(reportOnly = false) {
  console.log('🛡️  Starting Logging Safety Guardrail Check...');

  let hasErrors = false;
  const violations = [];

  // We rely on ripgrep (rg) for performance if available, otherwise fallback (not implemented for minimal script)
  // Assuming rg is present based on environment checks.

  const pattern = `(${LOGGING_PATTERNS.join('|')})`;

  // 1. Find all logging statements - Using max buffer to avoid ENOBUFS
  const rgResult = spawnSync('rg', [
    '-n', // line numbers
    pattern,
    '--glob', `*.{${FILE_EXTENSIONS.join(',')}}`,
    '--no-heading',
    'server', 'apps', 'packages', 'scripts' // targeted directories
  ], {
    encoding: 'utf-8',
    maxBuffer: 10 * 1024 * 1024 // 10MB buffer
  });

  if (rgResult.error) {
    console.error('❌ Error running ripgrep:', rgResult.error);
    process.exit(1);
  }

  if (rgResult.status !== 0 && rgResult.status !== 1) { // 1 means no matches found which is fine
      console.error('❌ Ripgrep failed with status:', rgResult.status);
      console.error(rgResult.stderr);
      process.exit(1);
  }

  const lines = rgResult.stdout ? rgResult.stdout.split('\n').filter(Boolean) : [];

  for (const line of lines) {
    // Format: file:line:content
    const parts = line.split(':');
    if (parts.length < 3) continue;

    const file = parts[0];
    const lineNum = parts[1];
    const content = parts.slice(2).join(':'); // Rejoin content in case of colons

    // Check for suppression
    if (content.includes('// no-log-check') || content.includes('// eslint-disable-next-line')) {
      continue;
    }

    // Check 1: Process.env logging
    if (content.includes('process.env')) {
       // Heuristic: allowed if explicitly accessing a known safe env var?
       // For now, flag all process.env logs as they are risky.
       // Exception: NODE_ENV is usually safe.
       if (!content.includes('NODE_ENV')) {
         violations.push({
           file,
           line: lineNum,
           type: 'ENV_VAR_LOG',
           message: 'Logging process.env is risky.',
           content: content.trim()
         });
         hasErrors = true;
       }
    }

    // Check 2: High risk keywords in variable names being logged
    for (const keyword of HIGH_RISK_KEYWORDS) {
      // Simple regex: keyword appearing as a whole word or property
      // We look for the keyword in the content.
      // To reduce false positives, we check if the keyword is part of a variable name (heuristic)
      // or string literal.
      const keywordRegex = new RegExp(`\\b${keyword}\\b`, 'i');
      if (keywordRegex.test(content)) {
         violations.push({
           file,
           line: lineNum,
           type: 'SENSITIVE_KEYWORD',
           message: `Possible sensitive keyword '${keyword}' detected in log.`,
           content: content.trim()
         });
         hasErrors = true;
         break; // One violation per line is enough
      }
    }
  }

  // Output results
  if (violations.length > 0) {
    console.log(`\nFound ${violations.length} potential logging safety violations:\n`);
    violations.forEach(v => {
      console.log(`  [${v.type}] ${v.file}:${v.line}`);
      console.log(`    Message: ${v.message}`);
      console.log(`    Code:    ${v.content}`);
      console.log('');
    });

    console.log('ℹ️  To suppress a false positive, add "// no-log-check" to the line.');
  } else {
    console.log('✅ No logging safety violations found.');
  }

  if (hasErrors && !reportOnly) {
    console.error('❌ Check failed. See violations above.');
    process.exit(1);
  } else if (hasErrors && reportOnly) {
    console.warn('⚠️  Violations found but --report mode is active. Exiting 0.');
    process.exit(0);
  }
}

const args = process.argv.slice(2);
const reportOnly = args.includes('--report');

runCheck(reportOnly);
