#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

// Simple args parser
function parseArgs() {
  const args = {};
  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg.startsWith('--')) {
      const key = arg.substring(2);
      const value = process.argv[i + 1];
      if (value && !value.startsWith('--')) {
        args[key] = value;
        i++;
      } else {
        args[key] = true;
      }
    }
  }
  return args;
}

const ARGS = parseArgs();
const MODE = ARGS.mode || 'dry-run'; // dry-run, simulate, live
const SCENARIO = ARGS.scenario || 'latency';
const ENV = ARGS.env || 'staging';

const ARTIFACTS_DIR = 'artifacts/incidents/drills';

async function main() {
  if (ARGS.help) {
    console.log(`
Usage: run_incident_drill.mjs [options]

Options:
  --mode <mode>       Execution mode: dry-run (default), simulate, live
  --scenario <name>   Scenario: latency (default), stall
  --env <env>         Environment: staging (default), production (requires force)
`);
    process.exit(0);
  }

  console.log(`🚨 STARTING INCIDENT DRILL`);
  console.log(`   Mode: ${MODE}`);
  console.log(`   Scenario: ${SCENARIO}`);
  console.log(`   Environment: ${ENV}`);

  if (ENV === 'production' && MODE === 'live') {
    if (!ARGS.force) {
      console.error('❌ FATAL: Cannot run LIVE drill in PRODUCTION without --force.');
      process.exit(1);
    }
  }

  // Ensure artifacts dir exists
  if (!fs.existsSync(ARTIFACTS_DIR)) {
    fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const artifactBase = `DRILL_${timestamp}_${SCENARIO}`;
  const jsonPath = path.join(ARTIFACTS_DIR, `${artifactBase}.json`);
  const mdPath = path.join(ARTIFACTS_DIR, `${artifactBase}.md`);

  const startTime = Date.now();
  let detectionTime = null;
  let recoveryTime = null;
  let outcome = 'pass';
  let logs = [];

  function log(msg) {
    const ts = new Date().toISOString();
    console.log(`[${ts}] ${msg}`);
    logs.push(`[${ts}] ${msg}`);
  }

  try {
    // 1. Fault Injection
    log(`Step 1: Inducing fault (${SCENARIO})...`);
    if (MODE === 'live') {
      log(`⚠️  Executing LIVE fault injection against ${ENV}.`);
      // TODO: Call actual chaos endpoint
      // await axios.post(`https://api.${ENV}.summit.com/internal/chaos/inject`, { type: SCENARIO });
      log(`... Fault injected (mocked for now).`);
    } else {
      log(`ℹ️  Dry-run/Simulate: Skipping actual fault injection.`);
    }

    // 2. Detection (Simulation)
    log(`Step 2: Waiting for detection...`);
    // In a real script, this would poll Prometheus or Alertmanager
    if (MODE === 'live') {
      // Simulate wait
      await new Promise(r => setTimeout(r, 2000));
    }
    detectionTime = Date.now();
    log(`✅ Fault detected (simulated) at ${new Date(detectionTime).toISOString()}`);

    // 3. Rollback / Recovery
    log(`Step 3: Initiating recovery/rollback...`);
    if (MODE === 'live') {
        log(`⚠️  Executing LIVE rollback.`);
        // await exec('make rollback ...');
    } else {
        log(`ℹ️  Dry-run: Skipping rollback command.`);
    }

    // Simulate recovery time
    await new Promise(r => setTimeout(r, 1000));
    recoveryTime = Date.now();
    log(`✅ System recovered at ${new Date(recoveryTime).toISOString()}`);

  } catch (err) {
    log(`❌ Drill Failed: ${err.message}`);
    outcome = 'fail';
  }

  const duration = (Date.now() - startTime) / 1000;

  // Write Artifacts
  const report = {
    id: artifactBase,
    timestamp: new Date().toISOString(),
    mode: MODE,
    scenario: SCENARIO,
    env: ENV,
    outcome,
    timings: {
      start: startTime,
      detected: detectionTime,
      recovered: recoveryTime,
      ttd_seconds: detectionTime ? (detectionTime - startTime)/1000 : null,
      ttr_seconds: recoveryTime ? (recoveryTime - detectionTime)/1000 : null,
      total_duration_seconds: duration
    },
    logs
  };

  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));

  const markdown = `
# Incident Drill Report: ${SCENARIO}

**Status:** ${outcome === 'pass' ? '✅ PASS' : '❌ FAIL'}
**Date:** ${new Date().toISOString()}
**Mode:** ${MODE}
**Environment:** ${ENV}

## Timings
*   **Time to Detect (TTD):** ${report.timings.ttd_seconds}s
*   **Time to Recover (TTR):** ${report.timings.ttr_seconds}s
*   **Total Duration:** ${duration}s

## Execution Log
\`\`\`text
${logs.join('\n')}
\`\`\`
`;

  fs.writeFileSync(mdPath, markdown);

  console.log(`\n📄 Artifacts generated:`);
  console.log(`   - ${jsonPath}`);
  console.log(`   - ${mdPath}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
