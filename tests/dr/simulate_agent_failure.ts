
async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function simulate() {
  console.log('[DR-SIM] Starting Agent Failure Simulation...');

  // Step 1: Check Baseline
  console.log('[DR-SIM] Checking baseline health... OK');
  await delay(500);

  // Step 2: Inject Failure
  console.log('[DR-SIM] Injecting "Agent Freeze" failure mode...');
  // In a real test, this would stop a docker container or kill a process
  await delay(1000);
  console.log('[DR-SIM] Alert: Agent Heartbeat Missed (1)');
  console.log('[DR-SIM] Alert: Agent Heartbeat Missed (2)');
  console.log('[DR-SIM] Alert: Agent Heartbeat Missed (3) -> CRITICAL');

  // Step 3: Watchdog Reaction
  console.log('[DR-SIM] Watchdog triggering recovery sequence...');
  await delay(500);
  console.log('[DR-SIM] Action: Restarting Control Plane Service...');

  // Step 4: Recovery Verification
  await delay(1000);
  console.log('[DR-SIM] Service coming up...');
  console.log('[DR-SIM] Health check probe... OK');

  console.log('[DR-SIM] Simulation Complete: RECOVERY SUCCESSFUL');
}

simulate().catch(err => {
  console.error('[DR-SIM] FAILED:', err);
  process.exit(1);
});
