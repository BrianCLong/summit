import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const args = process.argv.slice(2);
const commandIdx = args.indexOf('--command');
const nameIdx = args.indexOf('--name');
const retryIdx = args.indexOf('--retry');

if (commandIdx === -1 || nameIdx === -1) {
  console.error('Usage: node smart-runner.js --command "cmd" --name "Step Name" [--retry 2]');
  process.exit(1);
}

const command = args[commandIdx + 1];
const stepName = args[nameIdx + 1];
const maxRetries = retryIdx !== -1 ? parseInt(args[retryIdx + 1], 10) : 0;

const RETRIABLE_PATTERNS = [
  /ETIMEDOUT/,
  /ECONNRESET/,
  /fetch failed/,
  /503 Service Unavailable/,
  /socket hang up/,
  /ENOSPC/,
  /JavaScript heap out of memory/,
  /npm ERR! network/,
  /Database is locked/
];

const ERROR_CATEGORIES = {
  INFRASTRUCTURE: [/ETIMEDOUT/, /ECONNRESET/, /ENOSPC/, /npm ERR! network/],
  CODE_QUALITY: [/lint/, /typecheck/, /TS\d+/, /eslint/],
  TEST_FAILURE: [/failed/, /failing/],
  BUILD_ERROR: [/build failed/, /compilation error/]
};

// Basic warning patterns for ESLint, TSC, etc.
const WARNING_PATTERNS = [
  /warning:/i,
  /WARNING:/
];

function classifyError(output) {
  for (const [cat, patterns] of Object.entries(ERROR_CATEGORIES)) {
    if (patterns.some(p => p.test(output))) return cat;
  }
  return 'UNKNOWN';
}

function isRetriable(output) {
  return RETRIABLE_PATTERNS.some(p => p.test(output));
}

function countWarnings(output) {
  let count = 0;
  const lines = output.split('\n');
  for (const line of lines) {
    if (WARNING_PATTERNS.some(p => p.test(line))) {
      count++;
    }
  }
  return count;
}

function writeMetrics(name, duration, status, category, attempts, warnings) {
  const metrics = {
    name,
    duration,
    status,
    category,
    attempts,
    warnings,
    timestamp: new Date().toISOString()
  };
  const dir = path.join(process.cwd(), 'ci-metrics');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${name.replace(/\s+/g, '_')}.json`), JSON.stringify(metrics, null, 2));
}

async function run(attempt = 1) {
  console.log(`[SmartRunner] ${stepName} - Attempt ${attempt}/${maxRetries + 1}`);
  const startTime = Date.now();

  return new Promise((resolve) => {
    // shell: true allows command to be a string like "pnpm run test"
    const child = spawn(command, { shell: true, stdio: 'pipe' });

    // Limit buffer size to ~1MB to prevent heap overflow on massive logs
    const MAX_BUFFER = 1024 * 1024;
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', d => {
        process.stdout.write(d);
        if (stdout.length < MAX_BUFFER) stdout += d.toString();
    });
    child.stderr.on('data', d => {
        process.stderr.write(d);
        if (stderr.length < MAX_BUFFER) stderr += d.toString();
    });

    child.on('close', async (code) => {
      const duration = Date.now() - startTime;
      const combinedOutput = stdout + stderr;
      const warningCount = countWarnings(combinedOutput);

      if (code === 0) {
        writeMetrics(stepName, duration, 'SUCCESS', 'NONE', attempt, warningCount);
        resolve(0);
      } else {
        const category = classifyError(combinedOutput);
        console.log(`[SmartRunner] Failure classified as: ${category}`);

        if (attempt <= maxRetries && isRetriable(combinedOutput)) {
          console.log(`[SmartRunner] Detected retriable error. Retrying...`);
          await new Promise(r => setTimeout(r, attempt * 1000));
          resolve(run(attempt + 1));
        } else {
          writeMetrics(stepName, duration, 'FAILURE', category, attempt, warningCount);
          resolve(code);
        }
      }
    });
  });
}

run().then(code => process.exit(code));
