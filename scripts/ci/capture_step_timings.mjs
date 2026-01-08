import { spawn } from 'child_process';
import { writeFile, readFile, mkdir } from 'fs/promises';
import { join } from 'path';

const ARTIFACTS_DIR = 'artifacts/perf-budget';
const TIMINGS_FILE = join(ARTIFACTS_DIR, 'timings.json');

async function main() {
  // Check for --record-start flag
  if (process.argv[2] === '--record-start') {
    await recordStart();
    return;
  }

  const stepName = process.env.STEP_NAME || 'unknown';
  const command = process.argv.slice(2);

  if (command.length === 0) {
    console.error('Usage: node capture_step_timings.mjs <command...> OR --record-start');
    process.exit(1);
  }

  const startTime = Date.now();
  console.log(`[PerfBudget] Starting step "${stepName}"...`);

  const child = spawn(command[0], command.slice(1), { stdio: 'inherit', shell: true });

  const exitCode = await new Promise((resolve) => {
    child.on('close', resolve);
  });

  const endTime = Date.now();
  const durationSeconds = (endTime - startTime) / 1000;

  console.log(`[PerfBudget] Step "${stepName}" finished in ${durationSeconds.toFixed(2)}s with exit code ${exitCode}`);

  await recordTiming(stepName, startTime, endTime, durationSeconds, exitCode);

  process.exit(exitCode);
}

async function recordStart() {
  try {
    await mkdir(ARTIFACTS_DIR, { recursive: true });
    const timings = {
      _job_start: Date.now()
    };
    await writeFile(TIMINGS_FILE, JSON.stringify(timings, null, 2));
    console.log('[PerfBudget] Job start time recorded.');
  } catch (err) {
    console.error('[PerfBudget] Failed to record job start:', err);
  }
}

async function recordTiming(stepName, startTime, endTime, durationSeconds, exitCode) {
  try {
    await mkdir(ARTIFACTS_DIR, { recursive: true });

    let timings = {};
    try {
      const data = await readFile(TIMINGS_FILE, 'utf8');
      timings = JSON.parse(data);
    } catch (e) {
      // File doesn't exist or is invalid, start fresh
      timings = {};
    }

    timings[stepName] = {
      start_ts: startTime,
      end_ts: endTime,
      duration_seconds: durationSeconds,
      exit_code: exitCode
    };

    await writeFile(TIMINGS_FILE, JSON.stringify(timings, null, 2));
  } catch (err) {
    console.error('[PerfBudget] Failed to record timing:', err);
  }
}

main();
